import { NextRequest, NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/server";
import { requireOrganizationAccess } from "@/lib/api-management/authorization";
import { supabaseAdmin } from "@/lib/supabase-admin";

/* =========================================================
   Types
========================================================= */

type ProviderRelation = {
  provider_name: string;
};

type UsageRawResponse = Record<string, unknown> | null;

type UsageRow = {
  id: string;
  date: string;
  total_cost_usd: number | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  request_count: number | null;
  request_id: string | null;
  fetched_at: string | null;
  stop_reason: string | null;
  raw_response: UsageRawResponse;
  provider_id: string;
  organization_id: string | null;
  project_id: string | null;
  environment_id: string | null;
  sdk_key_id: string | null;

  providers:
    | ProviderRelation
    | ProviderRelation[]
    | null;
};

type DimensionMetadata = {
  projectNames: Map<string, string>;
  environmentNames: Map<string, string>;
  environmentProjects: Map<string, string>;
  apiKeyNames: Map<string, string>;
  apiKeyLastUsed: Map<string, string | null>;
};

type NormalizedUsage = {
  id: string;
  date: string;
  provider: string;
  model: string;
  stop_reason: string | null;
  total_cost_usd: number;
  total_tokens: number;
  input_tokens: number;
  output_tokens: number;
  request_count: number;
  request_id: string | null;
  fetched_at: string | null;

  organization_id: string | null;
  project_id: string | null;
  environment_id: string | null;
  sdk_key_id: string | null;

  project_name: string;
  environment_name: string;
  environment_project_name: string;
  api_key_name: string;
  api_key_last_used: string | null;
};

/* =========================================================
   Helpers
========================================================= */

function getRelation<T>(
  relation: T | T[] | null,
): T | null {
  if (!relation) {
    return null;
  }

  return Array.isArray(relation)
    ? relation[0] ?? null
    : relation;
}

function getModelFromRawResponse(
  rawResponse: UsageRawResponse,
): string {
  if (!rawResponse) {
    return "Unknown";
  }

  const model =
    typeof rawResponse.model === "string"
      ? rawResponse.model
      : typeof rawResponse.model_name === "string"
        ? rawResponse.model_name
        : typeof rawResponse.modelName === "string"
          ? rawResponse.modelName
          : null;

  return model || "Unknown";
}

function getDateRange(range: string) {
  const end = new Date();
  const start = new Date(end);

  switch (range) {
    case "24h":
      start.setHours(start.getHours() - 24);
      break;

    case "7d":
      start.setDate(start.getDate() - 7);
      break;

    case "30d":
    default:
      start.setDate(start.getDate() - 30);
      break;
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

function emptyMetadata(): DimensionMetadata {
  return {
    projectNames: new Map(),
    environmentNames: new Map(),
    environmentProjects: new Map(),
    apiKeyNames: new Map(),
    apiKeyLastUsed: new Map(),
  };
}

/* =========================================================
   Authorization helpers
========================================================= */

async function verifyProjectAccess(
  projectId: string,
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("projects")
    .select(`
      id,
      department_id,
      departments (
        id,
        organization_id
      )
    `)
    .eq("id", projectId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to verify project: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error("Project not found");
  }

  const department = Array.isArray(data.departments)
    ? data.departments[0]
    : data.departments;

  if (!department) {
    throw new Error("Department not found");
  }

  await requireOrganizationAccess(
    department.organization_id,
  );

  return {
    projectId: data.id,
    organizationId: department.organization_id,
  };
}

async function verifyEnvironmentAccess(
  environmentId: string,
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("environments")
    .select(`
      id,
      project_id,
      projects (
        id,
        department_id,
        departments (
          id,
          organization_id
        )
      )
    `)
    .eq("id", environmentId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to verify environment: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error("Environment not found");
  }

  const project = Array.isArray(data.projects)
    ? data.projects[0]
    : data.projects;

  if (!project) {
    throw new Error("Project not found");
  }

  const department = Array.isArray(project.departments)
    ? project.departments[0]
    : project.departments;

  if (!department) {
    throw new Error("Department not found");
  }

  await requireOrganizationAccess(
    department.organization_id,
  );

  return {
    environmentId: data.id,
    projectId: project.id,
    organizationId: department.organization_id,
  };
}

async function verifyApiKeyAccess(
  sdkKeyId: string,
  userId: string,
) {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("api_keys")
    .select(`
      id,
      user_id,
      project_id,
      environment_id
    `)
    .eq("id", sdkKeyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to verify API key: ${error.message}`,
    );
  }

  if (!data) {
    throw new Error("API key not found");
  }

  if (data.environment_id) {
    const environment =
      await verifyEnvironmentAccess(data.environment_id);

    return {
      sdkKeyId: data.id,
      projectId:
        data.project_id ?? environment.projectId,
      environmentId: data.environment_id,
      organizationId: environment.organizationId,
    };
  }

  if (data.project_id) {
    const project = await verifyProjectAccess(data.project_id);

    return {
      sdkKeyId: data.id,
      projectId: data.project_id,
      environmentId: null,
      organizationId: project.organizationId,
    };
  }

  throw new Error("API key is not linked to a project");
}

async function getDepartmentProjectIds(
  departmentId: string,
) {
  const {
    data: department,
    error: departmentError,
  } = await supabaseAdmin
    .from("departments")
    .select("id, organization_id")
    .eq("id", departmentId)
    .maybeSingle();

  if (departmentError) {
    throw new Error(
      `Failed to verify department: ${departmentError.message}`,
    );
  }

  if (!department) {
    throw new Error("Department not found");
  }

  await requireOrganizationAccess(
    department.organization_id,
  );

  const {
    data: projects,
    error: projectsError,
  } = await supabaseAdmin
    .from("projects")
    .select("id")
    .eq("department_id", departmentId);

  if (projectsError) {
    throw new Error(
      `Failed to load department projects: ${projectsError.message}`,
    );
  }

  return {
    organizationId: department.organization_id,
    projectIds: (projects ?? []).map((project) => project.id),
  };
}

/* =========================================================
   Fetch usage
========================================================= */

async function fetchUsageRows(
  userId: string,
  startDate: string,
  endDate: string,
  filters: {
    organizationId: string | null;
    departmentId: string | null;
    projectId: string | null;
    environmentId: string | null;
    sdkKeyId: string | null;
    providerId: string | null;
  },
): Promise<UsageRow[]> {
  let departmentProjectIds: string[] | null = null;

  if (filters.departmentId) {
    const department = await getDepartmentProjectIds(
      filters.departmentId,
    );

    departmentProjectIds = department.projectIds;
  }

  if (
    departmentProjectIds &&
    departmentProjectIds.length === 0
  ) {
    return [];
  }

  let query = supabaseAdmin
    .from("usage_records")
    .select(`
      id,
      date,
      total_cost_usd,
      prompt_tokens,
      completion_tokens,
      total_tokens,
      request_count,
      request_id,
      fetched_at,
      stop_reason,
      raw_response,
      provider_id,
      organization_id,
      project_id,
      environment_id,
      sdk_key_id,
      providers (
        provider_name
      )
    `)
    .eq("user_id", userId)
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date", { ascending: true });

  if (filters.organizationId) {
    query = query.eq(
      "organization_id",
      filters.organizationId,
    );
  }

  if (filters.projectId) {
    query = query.eq(
      "project_id",
      filters.projectId,
    );
  }

  if (departmentProjectIds) {
    query = query.in(
      "project_id",
      departmentProjectIds,
    );
  }

  if (filters.environmentId) {
    query = query.eq(
      "environment_id",
      filters.environmentId,
    );
  }

  if (filters.sdkKeyId) {
    query = query.eq(
      "sdk_key_id",
      filters.sdkKeyId,
    );
  }

  if (filters.providerId) {
    query = query.eq(
      "provider_id",
      filters.providerId,
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error(
      "❌ Failed to fetch usage records:",
      error,
    );

    throw new Error(error.message);
  }

  return (data ?? []) as unknown as UsageRow[];
}

/* =========================================================
   Dashboard metadata
========================================================= */

async function loadDimensionMetadata(
  userId: string,
  rows: UsageRow[],
): Promise<DimensionMetadata> {
  const metadata = emptyMetadata();

  const projectIds = Array.from(
    new Set(
      rows
        .map((row) => row.project_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const environmentIds = Array.from(
    new Set(
      rows
        .map((row) => row.environment_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  const apiKeyIds = Array.from(
    new Set(
      rows
        .map((row) => row.sdk_key_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (projectIds.length) {
    const { data, error } = await supabaseAdmin
      .from("projects")
      .select("id, name")
      .in("id", projectIds);

    if (error) {
      throw new Error(
        `Failed to load project names: ${error.message}`,
      );
    }

    for (const row of data ?? []) {
      metadata.projectNames.set(row.id, row.name);
    }
  }

  if (environmentIds.length) {
    const { data, error } = await supabaseAdmin
      .from("environments")
      .select("id, name, project_id")
      .in("id", environmentIds);

    if (error) {
      throw new Error(
        `Failed to load environment names: ${error.message}`,
      );
    }

    for (const row of data ?? []) {
      metadata.environmentNames.set(row.id, row.name);

      if (row.project_id) {
        const projectName = metadata.projectNames.get(
          row.project_id,
        );

        metadata.environmentProjects.set(
          row.id,
          projectName ?? row.project_id,
        );
      }
    }
  }

  if (apiKeyIds.length) {
    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, last_used")
      .eq("user_id", userId)
      .in("id", apiKeyIds);

    if (error) {
      throw new Error(
        `Failed to load API key metadata: ${error.message}`,
      );
    }

    for (const row of data ?? []) {
      metadata.apiKeyNames.set(
        row.id,
        row.name ?? row.id,
      );
      metadata.apiKeyLastUsed.set(
        row.id,
        row.last_used ?? null,
      );
    }
  }

  return metadata;
}

function normalizeRows(
  rows: UsageRow[],
  metadata?: DimensionMetadata,
): NormalizedUsage[] {
  const safeMetadata = metadata ?? emptyMetadata();

  return rows.map((row) => {
    const provider = getRelation(row.providers);

    const inputTokens = Number(row.prompt_tokens ?? 0);
    const outputTokens = Number(row.completion_tokens ?? 0);

    const totalTokens =
      row.total_tokens !== null &&
      row.total_tokens !== undefined
        ? Number(row.total_tokens)
        : inputTokens + outputTokens;

    const projectName = row.project_id
      ? safeMetadata.projectNames.get(row.project_id) ??
        row.project_id
      : "Unassigned";

    const environmentName = row.environment_id
      ? safeMetadata.environmentNames.get(
          row.environment_id,
        ) ?? row.environment_id
      : "Unassigned";

    const environmentProjectName = row.environment_id
      ? safeMetadata.environmentProjects.get(
          row.environment_id,
        ) ?? projectName
      : projectName;

    const apiKeyName = row.sdk_key_id
      ? safeMetadata.apiKeyNames.get(row.sdk_key_id) ??
        row.sdk_key_id
      : "Unassigned";

    const apiKeyLastUsed = row.sdk_key_id
      ? safeMetadata.apiKeyLastUsed.get(row.sdk_key_id) ?? null
      : null;

    return {
      id: row.id,
      date: row.date,
      provider: provider?.provider_name ?? "Unknown",
      model: getModelFromRawResponse(row.raw_response),
      stop_reason: row.stop_reason ?? null,
      total_cost_usd: Number(row.total_cost_usd ?? 0),
      total_tokens: totalTokens,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      request_count: Number(row.request_count ?? 0),
      request_id: row.request_id ?? null,
      fetched_at: row.fetched_at ?? null,
      organization_id: row.organization_id ?? null,
      project_id: row.project_id ?? null,
      environment_id: row.environment_id ?? null,
      sdk_key_id: row.sdk_key_id ?? null,
      project_name: projectName,
      environment_name: environmentName,
      environment_project_name: environmentProjectName,
      api_key_name: apiKeyName,
      api_key_last_used: apiKeyLastUsed,
    };
  });
}

/* =========================================================
   Analytics calculations
========================================================= */

function getSummary(rows: NormalizedUsage[]) {
  return {
    request_count: rows.reduce(
      (sum, row) => sum + row.request_count,
      0,
    ),
    total_cost: rows.reduce(
      (sum, row) => sum + row.total_cost_usd,
      0,
    ),
    input_tokens: rows.reduce(
      (sum, row) => sum + row.input_tokens,
      0,
    ),
    output_tokens: rows.reduce(
      (sum, row) => sum + row.output_tokens,
      0,
    ),
    total_tokens: rows.reduce(
      (sum, row) => sum + row.total_tokens,
      0,
    ),
  };
}

function getTimeSeries(rows: NormalizedUsage[]) {
  const groups = new Map<string, NormalizedUsage[]>();

  for (const row of rows) {
    const current = groups.get(row.date) ?? [];
    current.push(row);
    groups.set(row.date, current);
  }

  return Array.from(groups.entries())
    .map(([date, items]) => ({
      date,
      cost: items.reduce(
        (sum, row) => sum + row.total_cost_usd,
        0,
      ),
      tokens: items.reduce(
        (sum, row) => sum + row.total_tokens,
        0,
      ),
      requests: items.reduce(
        (sum, row) => sum + row.request_count,
        0,
      ),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function getProviderBreakdown(rows: NormalizedUsage[]) {
  const groups = new Map<string, NormalizedUsage[]>();

  for (const row of rows) {
    const current = groups.get(row.provider) ?? [];
    current.push(row);
    groups.set(row.provider, current);
  }

  return Array.from(groups.entries())
    .map(([provider, items]) => ({
      provider,
      cost: items.reduce(
        (sum, row) => sum + row.total_cost_usd,
        0,
      ),
      tokens: items.reduce(
        (sum, row) => sum + row.total_tokens,
        0,
      ),
      requests: items.reduce(
        (sum, row) => sum + row.request_count,
        0,
      ),
    }))
    .sort((a, b) => b.cost - a.cost);
}

function getModelBreakdown(rows: NormalizedUsage[]) {
  const groups = new Map<string, NormalizedUsage[]>();

  for (const row of rows) {
    const current = groups.get(row.model) ?? [];
    current.push(row);
    groups.set(row.model, current);
  }

  return Array.from(groups.entries())
    .map(([model, items]) => ({
      model,
      cost: items.reduce(
        (sum, row) => sum + row.total_cost_usd,
        0,
      ),
      tokens: items.reduce(
        (sum, row) => sum + row.total_tokens,
        0,
      ),
      requests: items.reduce(
        (sum, row) => sum + row.request_count,
        0,
      ),
    }))
    .sort((a, b) => b.cost - a.cost);
}

function getStopReasons(rows: NormalizedUsage[]) {
  const groups = new Map<string, number>();

  for (const row of rows) {
    const reason = row.stop_reason ?? "unknown";
    groups.set(
      reason,
      (groups.get(reason) ?? 0) + row.request_count,
    );
  }

  return Array.from(groups.entries())
    .map(([reason, requests]) => ({ reason, requests }))
    .sort((a, b) => b.requests - a.requests);
}

function getRecentRequests(rows: NormalizedUsage[]) {
  return [...rows]
    .sort((a, b) => {
      const aTime = a.fetched_at
        ? new Date(a.fetched_at).getTime()
        : 0;
      const bTime = b.fetched_at
        ? new Date(b.fetched_at).getTime()
        : 0;

      return bTime - aTime;
    })
    .slice(0, 100)
    .map((row) => ({
      request_id: row.request_id ?? row.id,
      created_at: row.fetched_at,
      provider: row.provider,
      model: row.model,
      stop_reason: row.stop_reason,
      input_tokens: row.input_tokens,
      output_tokens: row.output_tokens,
      total_cost_usd: row.total_cost_usd,
      total_tokens: row.total_tokens,
      request_count: row.request_count,
      organization_id: row.organization_id,
      project_id: row.project_id,
      environment_id: row.environment_id,
      sdk_key_id: row.sdk_key_id,
    }));
}

function getProjectBreakdown(rows: NormalizedUsage[]) {
  const groups = new Map<
    string,
    {
      project_id: string | null;
      project: string;
      cost: number;
      tokens: number;
      requests: number;
    }
  >();

  for (const row of rows) {
    const key = row.project_id ?? "unassigned";
    const current =
      groups.get(key) ?? {
        project_id: row.project_id,
        project: row.project_name,
        cost: 0,
        tokens: 0,
        requests: 0,
      };

    current.cost += row.total_cost_usd;
    current.tokens += row.total_tokens;
    current.requests += row.request_count;
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.cost - a.cost,
  );
}

function getEnvironmentBreakdown(rows: NormalizedUsage[]) {
  const groups = new Map<
    string,
    {
      environment_id: string | null;
      environment: string;
      project: string;
      cost: number;
      tokens: number;
      requests: number;
    }
  >();

  for (const row of rows) {
    const key = row.environment_id ?? "unassigned";
    const current =
      groups.get(key) ?? {
        environment_id: row.environment_id,
        environment: row.environment_name,
        project: row.environment_project_name,
        cost: 0,
        tokens: 0,
        requests: 0,
      };

    current.cost += row.total_cost_usd;
    current.tokens += row.total_tokens;
    current.requests += row.request_count;
    groups.set(key, current);
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.cost - a.cost,
  );
}

function getApiKeyActivity(rows: NormalizedUsage[]) {
  const groups = new Map<
    string,
    {
      sdk_key_id: string | null;
      api_key: string;
      last_used: string | null;
      cost: number;
      tokens: number;
      requests: number;
    }
  >();

  for (const row of rows) {
    const key = row.sdk_key_id ?? "unassigned";
    const current =
      groups.get(key) ?? {
        sdk_key_id: row.sdk_key_id,
        api_key: row.api_key_name,
        last_used: row.api_key_last_used,
        cost: 0,
        tokens: 0,
        requests: 0,
      };

    current.cost += row.total_cost_usd;
    current.tokens += row.total_tokens;
    current.requests += row.request_count;

    if (!current.last_used && row.fetched_at) {
      current.last_used = row.fetched_at;
    }

    groups.set(key, current);
  }

  return Array.from(groups.values()).sort(
    (a, b) => b.requests - a.requests,
  );
}

function getModelEfficiency(rows: NormalizedUsage[]) {
  return getModelBreakdown(rows).map((item) => ({
    ...item,
    cost_per_1k_tokens:
      item.tokens > 0
        ? item.cost / (item.tokens / 1000)
        : 0,
  }));
}

/* =========================================================
   GET
========================================================= */

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      endpoint: string;
    }>;
  },
) {
  try {
    const { userId } = await requireUser();
    const { endpoint } = await params;

    const { searchParams } = new URL(request.url);

    const range = searchParams.get("range") ?? "30d";

    const organizationId = searchParams.get(
      "organizationId",
    );

    const departmentId = searchParams.get("departmentId");
    const projectId = searchParams.get("projectId");
    const environmentId = searchParams.get("environmentId");
    const sdkKeyId = searchParams.get("sdkKeyId");
    const providerId = searchParams.get("providerId");

    /* -------------------------------------------------------
       Validate hierarchy filters
    ------------------------------------------------------- */

    if (organizationId) {
      await requireOrganizationAccess(organizationId);
    }

    if (projectId) {
      await verifyProjectAccess(projectId);
    }

    if (environmentId) {
      await verifyEnvironmentAccess(environmentId);
    }

    if (sdkKeyId) {
      await verifyApiKeyAccess(sdkKeyId, userId);
    }

    if (providerId) {
      const {
        data: provider,
        error: providerError,
      } = await supabaseAdmin
        .from("providers")
        .select("id")
        .eq("id", providerId)
        .eq("user_id", userId)
        .maybeSingle();

      if (providerError) {
        throw new Error(
          `Failed to verify provider: ${providerError.message}`,
        );
      }

      if (!provider) {
        throw new Error("Provider not found");
      }
    }

    if (departmentId) {
      await getDepartmentProjectIds(departmentId);
    }

    /* -------------------------------------------------------
       Date range and usage
    ------------------------------------------------------- */

    const { startDate, endDate } = getDateRange(range);

    const rawRows = await fetchUsageRows(
      userId,
      startDate,
      endDate,
      {
        organizationId,
        departmentId,
        projectId,
        environmentId,
        sdkKeyId,
        providerId,
      },
    );

    const appliedFilters = {
      organizationId: organizationId ?? null,
      departmentId: departmentId ?? null,
      projectId: projectId ?? null,
      environmentId: environmentId ?? null,
      sdkKeyId: sdkKeyId ?? null,
      providerId: providerId ?? null,
    };

    /* -------------------------------------------------------
       Analytics V2 dashboard endpoint
    ------------------------------------------------------- */

    if (endpoint === "dashboard") {
      const metadata = await loadDimensionMetadata(
        userId,
        rawRows,
      );

      const rows = normalizeRows(rawRows, metadata);

      return NextResponse.json({
        range,
        filters: appliedFilters,
        summary: {
          range,
          ...getSummary(rows),
        },
        timeseries: {
          range,
          data: getTimeSeries(rows),
        },
        providers: {
          range,
          data: getProviderBreakdown(rows),
        },
        models: {
          range,
          data: getModelBreakdown(rows),
        },
        stopReasons: {
          range,
          data: getStopReasons(rows),
        },
        requests: {
          range,
          rows: getRecentRequests(rows),
        },
        projects: {
          range,
          data: getProjectBreakdown(rows),
        },
        environments: {
          range,
          data: getEnvironmentBreakdown(rows),
        },
        apiKeys: {
          range,
          data: getApiKeyActivity(rows),
        },
        efficiency: {
          range,
          data: getModelEfficiency(rows),
        },
      });
    }

    /* -------------------------------------------------------
       Legacy endpoints kept for compatibility
    ------------------------------------------------------- */

    const rows = normalizeRows(rawRows);

    switch (endpoint) {
      case "summary":
        return NextResponse.json({
          range,
          filters: appliedFilters,
          ...getSummary(rows),
        });

      case "timeseries":
        return NextResponse.json({
          range,
          filters: appliedFilters,
          data: getTimeSeries(rows),
        });

      case "providers":
        return NextResponse.json({
          range,
          filters: appliedFilters,
          data: getProviderBreakdown(rows),
        });

      case "models":
        return NextResponse.json({
          range,
          filters: appliedFilters,
          data: getModelBreakdown(rows),
        });

      case "stop-reasons":
        return NextResponse.json({
          range,
          filters: appliedFilters,
          data: getStopReasons(rows),
        });

      case "requests":
        return NextResponse.json({
          range,
          filters: appliedFilters,
          rows: getRecentRequests(rows),
        });

      case "projects": {
        const metadata = await loadDimensionMetadata(
          userId,
          rawRows,
        );
        const namedRows = normalizeRows(rawRows, metadata);

        return NextResponse.json({
          range,
          filters: appliedFilters,
          data: getProjectBreakdown(namedRows),
        });
      }

      case "environments": {
        const metadata = await loadDimensionMetadata(
          userId,
          rawRows,
        );
        const namedRows = normalizeRows(rawRows, metadata);

        return NextResponse.json({
          range,
          filters: appliedFilters,
          data: getEnvironmentBreakdown(namedRows),
        });
      }

      case "api-keys": {
        const metadata = await loadDimensionMetadata(
          userId,
          rawRows,
        );
        const namedRows = normalizeRows(rawRows, metadata);

        return NextResponse.json({
          range,
          filters: appliedFilters,
          data: getApiKeyActivity(namedRows),
        });
      }

      case "efficiency": {
        const metadata = await loadDimensionMetadata(
          userId,
          rawRows,
        );
        const namedRows = normalizeRows(rawRows, metadata);

        return NextResponse.json({
          range,
          filters: appliedFilters,
          data: getModelEfficiency(namedRows),
        });
      }

      default:
        return NextResponse.json(
          {
            error: `Unknown analytics endpoint: ${endpoint}`,
          },
          {
            status: 404,
          },
        );
    }
  } catch (error) {
    console.error("❌ Analytics API error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to load analytics.";

    const status =
      message === "Unauthorized"
        ? 401
        : message.startsWith("Forbidden:")
          ? 403
          : message.includes("not found")
            ? 404
            : 500;

    return NextResponse.json(
      {
        error: message,
      },
      {
        status,
      },
    );
  }
}
