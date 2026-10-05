"use client";

import { useEffect, useMemo, useState } from "react";

import LineChart from "@/app/_components/charts/LineChart";
import PieChart from "@/app/_components/charts/PieChart";

export type TimeFrame = "24h" | "7d" | "30d";

// ============================================================
// TYPES
// ============================================================

type Organization = {
  id: string;
  name: string;
};

type Department = {
  id: string;
  organization_id: string;
  name: string;
};

type Project = {
  id: string;
  department_id: string;
  name: string;
};

type Environment = {
  id: string;
  project_id: string;
  name: string;
};

type ApiKey = {
  id: string;
  name: string;
  project_id: string;
  environment_id: string;
  revoked?: boolean;
  last_used?: string | null;
};

type Provider = {
  id: string;
  provider_name: string;
  display_name?: string | null;
  is_active?: boolean;
};

type SummaryData = {
  range?: string;
  request_count: number;
  total_cost: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

type TimeseriesRow = {
  date: string;
  cost: number;
  tokens: number;
  requests: number;
};

type TimeseriesResponse = {
  range?: string;
  data: TimeseriesRow[];
};

type ProviderRow = {
  provider: string;
  cost: number;
  tokens: number;
  requests: number;
};

type ProviderResponse = {
  range?: string;
  data: ProviderRow[];
};

type ModelRow = {
  model: string;
  cost: number;
  tokens: number;
  requests: number;
};

type ModelResponse = {
  range?: string;
  data: ModelRow[];
};

type StopReasonRow = {
  reason: string;
  requests: number;
};

type StopReasonResponse = {
  range?: string;
  data: StopReasonRow[];
};

type RequestRow = {
  request_id: string | null;
  created_at?: string | null;
  fetched_at?: string | null;
  provider: string;
  model: string;
  stop_reason: string | null;
  input_tokens: number;
  output_tokens: number;
  total_cost_usd: number;
  total_tokens?: number;
  request_count?: number;
  organization_id?: string | null;
  project_id?: string | null;
  environment_id?: string | null;
  sdk_key_id?: string | null;
};

type RequestResponse = {
  range?: string;
  rows: RequestRow[];
};

type ProjectBreakdownRow = {
  project_id: string | null;
  project: string;
  cost: number;
  tokens: number;
  requests: number;
};

type ProjectBreakdownResponse = {
  range?: string;
  data: ProjectBreakdownRow[];
};

type EnvironmentBreakdownRow = {
  environment_id: string | null;
  environment: string;
  project: string;
  cost: number;
  tokens: number;
  requests: number;
};

type EnvironmentBreakdownResponse = {
  range?: string;
  data: EnvironmentBreakdownRow[];
};

type ApiKeyActivityRow = {
  sdk_key_id: string | null;
  api_key: string;
  last_used: string | null;
  cost: number;
  tokens: number;
  requests: number;
};

type ApiKeyActivityResponse = {
  range?: string;
  data: ApiKeyActivityRow[];
};

type EfficiencyRow = {
  model: string;
  cost: number;
  tokens: number;
  requests: number;
  cost_per_1k_tokens: number;
};

type EfficiencyResponse = {
  range?: string;
  data: EfficiencyRow[];
};

type DashboardResponse = {
  range?: string;
  summary: SummaryData;
  timeseries: TimeseriesResponse;
  providers: ProviderResponse;
  models: ModelResponse;
  stopReasons: StopReasonResponse;
  requests: RequestResponse;
  projects: ProjectBreakdownResponse;
  environments: EnvironmentBreakdownResponse;
  apiKeys: ApiKeyActivityResponse;
  efficiency: EfficiencyResponse;
};

type Filters = {
  organizationId: string;
  departmentId: string;
  projectId: string;
  environmentId: string;
  sdkKeyId: string;
  providerId: string;
};

type BarItem = {
  label: string;
  value: number;
  secondary?: string;
  meta?: string;
  href?: string;
};

// ============================================================
// HELPERS
// ============================================================

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(Number(value ?? 0));
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(Number(value ?? 0));
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(
    Number(value ?? 0),
  );
}

function formatRate(value: number) {
  return formatUsd(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleString();
}

function parseTimeFrame(value: string | null): TimeFrame {
  if (value === "24h") {
    return "24h";
  }

  if (value === "30d") {
    return "30d";
  }

  return "7d";
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      payload?.error ||
        `Request failed with status ${response.status}`,
    );
  }

  return payload as T;
}

function buildAnalyticsUrl(
  endpoint: string,
  timeFrame: TimeFrame,
  filters: Filters,
) {
  const params = new URLSearchParams();

  params.set("range", timeFrame);

  if (filters.organizationId) {
    params.set(
      "organizationId",
      filters.organizationId,
    );
  }

  if (filters.departmentId) {
    params.set(
      "departmentId",
      filters.departmentId,
    );
  }

  if (filters.projectId) {
    params.set(
      "projectId",
      filters.projectId,
    );
  }

  if (filters.environmentId) {
    params.set(
      "environmentId",
      filters.environmentId,
    );
  }

  if (filters.sdkKeyId) {
    params.set(
      "sdkKeyId",
      filters.sdkKeyId,
    );
  }

  if (filters.providerId) {
    params.set(
      "providerId",
      filters.providerId,
    );
  }

  return `/api/analytics/${endpoint}?${params.toString()}`;
}

/**
 * Build a URL for navigating from one analytics dimension
 * into another while preserving useful higher-level filters.
 */
function buildDrilldownUrl(
  timeFrame: TimeFrame,
  current: Filters,
  target: Partial<Filters>,
) {
  const merged: Filters = {
    ...current,
    ...target,
  };

  const params = new URLSearchParams();

  params.set("range", timeFrame);
  params.set("source", "analytics");

  if (merged.organizationId) {
    params.set(
      "organizationId",
      merged.organizationId,
    );
  }

  if (merged.departmentId) {
    params.set(
      "departmentId",
      merged.departmentId,
    );
  }

  if (merged.projectId) {
    params.set(
      "projectId",
      merged.projectId,
    );
  }

  if (merged.environmentId) {
    params.set(
      "environmentId",
      merged.environmentId,
    );
  }

  if (merged.sdkKeyId) {
    params.set(
      "sdkKeyId",
      merged.sdkKeyId,
    );
  }

  if (merged.providerId) {
    params.set(
      "providerId",
      merged.providerId,
    );
  }

  return `/dashboard/stats?${params.toString()}`;
}

function toBarItems(
  rows: Array<{
    label: string;
    value: number;
    secondary?: string;
    meta?: string;
    href?: string;
  }>,
  limit = 8,
): BarItem[] {
  return rows
    .filter(
      (item) =>
        Number(item.value ?? 0) > 0,
    )
    .sort(
      (a, b) =>
        b.value - a.value,
    )
    .slice(0, limit);
}

// ============================================================
// SMALL PRESENTATIONAL COMPONENTS
// ============================================================

function LoadingBox({
  height = 280,
}: {
  height?: number;
}) {
  return (
    <div
      className="flex items-center justify-center text-sm text-slate-400"
      style={{ minHeight: height }}
    >
      Loading chart...
    </div>
  );
}

function EmptyBox({
  message,
  height = 280,
}: {
  message: string;
  height?: number;
}) {
  return (
    <div
      className="flex items-center justify-center text-center text-sm text-slate-400"
      style={{ minHeight: height }}
    >
      {message}
    </div>
  );
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-sm uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-semibold text-slate-900">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {description}
      </p>
    </div>
  );
}

function HorizontalBars({
  items,
  valueFormatter,
  emptyMessage,
}: {
  items: BarItem[];
  valueFormatter: (value: number) => string;
  emptyMessage: string;
}) {
  const max = Math.max(
    ...items.map(
      (item) => item.value,
    ),
    0,
  );

  if (!items.length) {
    return (
      <EmptyBox
        message={emptyMessage}
        height={240}
      />
    );
  }

  return (
    <div className="space-y-5">
      {items.map((item) => {
        const percentage =
          max > 0
            ? Math.max(
                (item.value / max) * 100,
                4,
              )
            : 0;

        const content = (
          <div className="rounded-xl px-2 py-1">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">
                  {item.label}
                </p>

                {item.secondary ? (
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {item.secondary}
                  </p>
                ) : null}
              </div>

              <span className="shrink-0 text-sm font-semibold text-slate-900">
                {valueFormatter(item.value)}
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-all"
                style={{
                  width: `${percentage}%`,
                }}
              />
            </div>

            {item.meta ? (
              <p className="mt-1.5 text-xs text-slate-500">
                {item.meta}
              </p>
            ) : null}
          </div>
        );

        if (!item.href) {
          return (
            <div
              key={`${item.label}-${item.value}`}
            >
              {content}
            </div>
          );
        }

        return (
          <a
            key={`${item.label}-${item.value}`}
            href={item.href}
            className="block rounded-xl transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
            title="Open filtered analytics"
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}

// ============================================================
// COMPONENT
// ============================================================

export default function AnalyticsDashboardClient() {
  const [timeFrame, setTimeFrame] =
    useState<TimeFrame>("7d");

  /**
   * URL parameters are read after hydration so the component
   * remains compatible with the current Next.js dashboard setup.
   */
  const [
    filtersInitialized,
    setFiltersInitialized,
  ] = useState(false);

  const [
    drilldownSource,
    setDrilldownSource,
  ] = useState("");

  // ----------------------------------------------------------
  // HIERARCHY DATA
  // ----------------------------------------------------------

  const [
    organizations,
    setOrganizations,
  ] = useState<Organization[]>([]);

  const [
    departments,
    setDepartments,
  ] = useState<Department[]>([]);

  const [
    projects,
    setProjects,
  ] = useState<Project[]>([]);

  const [
    environments,
    setEnvironments,
  ] = useState<Environment[]>([]);

  const [
    sdkKeys,
    setSdkKeys,
  ] = useState<ApiKey[]>([]);

  const [
    providers,
    setProviders,
  ] = useState<Provider[]>([]);

  // ----------------------------------------------------------
  // FILTER VALUES
  // ----------------------------------------------------------

  const [
    organizationId,
    setOrganizationId,
  ] = useState("");

  const [
    departmentId,
    setDepartmentId,
  ] = useState("");

  const [
    projectId,
    setProjectId,
  ] = useState("");

  const [
    environmentId,
    setEnvironmentId,
  ] = useState("");

  const [
    sdkKeyId,
    setSdkKeyId,
  ] = useState("");

  const [
    providerId,
    setProviderId,
  ] = useState("");

  // ----------------------------------------------------------
  // LOADING STATES
  // ----------------------------------------------------------

  const [
    loadingOrganizations,
    setLoadingOrganizations,
  ] = useState(true);

  const [
    loadingDepartments,
    setLoadingDepartments,
  ] = useState(false);

  const [
    loadingProjects,
    setLoadingProjects,
  ] = useState(false);

  const [
    loadingEnvironments,
    setLoadingEnvironments,
  ] = useState(false);

  const [
    loadingSdkKeys,
    setLoadingSdkKeys,
  ] = useState(false);

  const [
    loadingAnalytics,
    setLoadingAnalytics,
  ] = useState(true);

  // ----------------------------------------------------------
  // ANALYTICS DATA
  // ----------------------------------------------------------

  const [
    summaryData,
    setSummaryData,
  ] = useState<SummaryData | null>(null);

  const [
    timeseriesData,
    setTimeseriesData,
  ] = useState<TimeseriesResponse | null>(
    null,
  );

  const [
    providerData,
    setProviderData,
  ] = useState<ProviderResponse | null>(
    null,
  );

  const [
    modelData,
    setModelData,
  ] = useState<ModelResponse | null>(
    null,
  );

  const [
    stopReasonData,
    setStopReasonData,
  ] = useState<StopReasonResponse | null>(
    null,
  );

  const [
    requestRows,
    setRequestRows,
  ] = useState<RequestRow[]>([]);

  const [
    projectData,
    setProjectData,
  ] = useState<ProjectBreakdownResponse | null>(
    null,
  );

  const [
    environmentData,
    setEnvironmentData,
  ] = useState<EnvironmentBreakdownResponse | null>(
    null,
  );

  const [
    apiKeyData,
    setApiKeyData,
  ] = useState<ApiKeyActivityResponse | null>(
    null,
  );

  const [
    efficiencyData,
    setEfficiencyData,
  ] = useState<EfficiencyResponse | null>(
    null,
  );

  const [
    error,
    setError,
  ] = useState<string | null>(null);

  const [
    filterError,
    setFilterError,
  ] = useState<string | null>(null);

  // ==========================================================
  // READ URL DRILL-DOWN STATE
  // ==========================================================

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    setTimeFrame(
      parseTimeFrame(
        params.get("range"),
      ),
    );

    setOrganizationId(
      params.get("organizationId") ?? "",
    );

    setDepartmentId(
      params.get("departmentId") ?? "",
    );

    setProjectId(
      params.get("projectId") ?? "",
    );

    setEnvironmentId(
      params.get("environmentId") ?? "",
    );

    setSdkKeyId(
      params.get("sdkKeyId") ?? "",
    );

    setProviderId(
      params.get("providerId") ?? "",
    );

    setDrilldownSource(
      params.get("source") ?? "",
    );

    setFiltersInitialized(true);
  }, []);

  // ==========================================================
  // LOAD ORGANIZATIONS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadOrganizations() {
      setLoadingOrganizations(true);

      try {
        const response =
          await fetchJson<{
            organizations?: Organization[];
          }>(
            "/api/team/organizations",
          );

        if (cancelled) return;

        setOrganizations(
          response.organizations ?? [],
        );
      } catch (loadError) {
        if (cancelled) return;

        console.error(
          "Failed to load organizations:",
          loadError,
        );

        setOrganizations([]);

        setFilterError(
          loadError instanceof Error
            ? `Organizations: ${loadError.message}`
            : "Failed to load organizations.",
        );
      } finally {
        if (!cancelled) {
          setLoadingOrganizations(false);
        }
      }
    }

    loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // LOAD PROVIDERS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadProviders() {
      try {
        const response =
          await fetchJson<{
            providers?: Provider[];
          }>(
            "/api/providers",
          );

        if (cancelled) return;

        setProviders(
          response.providers ?? [],
        );
      } catch (loadError) {
        console.error(
          "Failed to load providers:",
          loadError,
        );

        if (!cancelled) {
          setProviders([]);
        }
      }
    }

    loadProviders();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // LOAD DEPARTMENTS
  // ==========================================================

  useEffect(() => {
    if (!organizationId) {
      setDepartments([]);
      return;
    }

    let cancelled = false;

    async function loadDepartments() {
      setLoadingDepartments(true);
      setFilterError(null);

      try {
        const response =
          await fetchJson<{
            departments?: Department[];
          }>(
            `/api/team/departments?organizationId=${encodeURIComponent(
              organizationId,
            )}`,
          );

        if (cancelled) return;

        setDepartments(
          response.departments ?? [],
        );
      } catch (loadError) {
        if (cancelled) return;

        console.error(
          "Failed to load departments:",
          loadError,
        );

        setDepartments([]);

        setFilterError(
          loadError instanceof Error
            ? `Departments: ${loadError.message}`
            : "Failed to load departments.",
        );
      } finally {
        if (!cancelled) {
          setLoadingDepartments(false);
        }
      }
    }

    loadDepartments();

    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  // ==========================================================
  // LOAD PROJECTS
  // ==========================================================

  useEffect(() => {
    if (!departmentId) {
      setProjects([]);
      return;
    }

    let cancelled = false;

    async function loadProjects() {
      setLoadingProjects(true);
      setFilterError(null);

      try {
        const response =
          await fetchJson<{
            projects?: Project[];
          }>(
            `/api/team/projects?departmentId=${encodeURIComponent(
              departmentId,
            )}`,
          );

        if (cancelled) return;

        setProjects(
          response.projects ?? [],
        );
      } catch (loadError) {
        if (cancelled) return;

        console.error(
          "Failed to load projects:",
          loadError,
        );

        setProjects([]);

        setFilterError(
          loadError instanceof Error
            ? `Projects: ${loadError.message}`
            : "Failed to load projects.",
        );
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, [departmentId]);

  // ==========================================================
  // LOAD ENVIRONMENTS
  // ==========================================================

  useEffect(() => {
    if (!projectId) {
      setEnvironments([]);
      return;
    }

    let cancelled = false;

    async function loadEnvironments() {
      setLoadingEnvironments(true);
      setFilterError(null);

      try {
        const response =
          await fetchJson<{
            environments?: Environment[];
          }>(
            `/api/team/environments?projectId=${encodeURIComponent(
              projectId,
            )}`,
          );

        if (cancelled) return;

        setEnvironments(
          response.environments ?? [],
        );
      } catch (loadError) {
        if (cancelled) return;

        console.error(
          "Failed to load environments:",
          loadError,
        );

        setEnvironments([]);

        setFilterError(
          loadError instanceof Error
            ? `Environments: ${loadError.message}`
            : "Failed to load environments.",
        );
      } finally {
        if (!cancelled) {
          setLoadingEnvironments(false);
        }
      }
    }

    loadEnvironments();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // ==========================================================
  // LOAD API KEYS
  // ==========================================================

  useEffect(() => {
    if (!environmentId) {
      setSdkKeys([]);
      return;
    }

    let cancelled = false;

    async function loadSdkKeys() {
      setLoadingSdkKeys(true);
      setFilterError(null);

      try {
        const response =
          await fetchJson<{
            apiKeys?: ApiKey[];
          }>(
            `/api/team/api-keys?environmentId=${encodeURIComponent(
              environmentId,
            )}`,
          );

        if (cancelled) return;

        setSdkKeys(
          response.apiKeys ?? [],
        );
      } catch (loadError) {
        if (cancelled) return;

        console.error(
          "Failed to load API keys:",
          loadError,
        );

        setSdkKeys([]);

        setFilterError(
          loadError instanceof Error
            ? `API Keys: ${loadError.message}`
            : "Failed to load API keys.",
        );
      } finally {
        if (!cancelled) {
          setLoadingSdkKeys(false);
        }
      }
    }

    loadSdkKeys();

    return () => {
      cancelled = true;
    };
  }, [environmentId]);

  // ==========================================================
  // LOAD ANALYTICS
  // ==========================================================

  useEffect(() => {
    if (!filtersInitialized) {
      return;
    }

    let cancelled = false;

    async function loadAnalytics() {
      setLoadingAnalytics(true);
      setError(null);

      const filters: Filters = {
        organizationId,
        departmentId,
        projectId,
        environmentId,
        sdkKeyId,
        providerId,
      };

      try {
        const response =
          await fetchJson<DashboardResponse>(
            buildAnalyticsUrl(
              "dashboard",
              timeFrame,
              filters,
            ),
          );

        if (cancelled) {
          return;
        }

        setSummaryData(
          response.summary,
        );

        setTimeseriesData(
          response.timeseries,
        );

        setProviderData(
          response.providers,
        );

        setModelData(
          response.models,
        );

        setStopReasonData(
          response.stopReasons,
        );

        setRequestRows(
          response.requests.rows ?? [],
        );

        setProjectData(
          response.projects,
        );

        setEnvironmentData(
          response.environments,
        );

        setApiKeyData(
          response.apiKeys,
        );

        setEfficiencyData(
          response.efficiency,
        );
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        console.error(
          "Failed to load analytics:",
          loadError,
        );

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load analytics.",
        );

        setSummaryData(null);
        setTimeseriesData(null);
        setProviderData(null);
        setModelData(null);
        setStopReasonData(null);
        setRequestRows([]);
        setProjectData(null);
        setEnvironmentData(null);
        setApiKeyData(null);
        setEfficiencyData(null);
      } finally {
        if (!cancelled) {
          setLoadingAnalytics(false);
        }
      }
    }

    loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [
    filtersInitialized,
    timeFrame,
    organizationId,
    departmentId,
    projectId,
    environmentId,
    sdkKeyId,
    providerId,
  ]);

  // ==========================================================
  // DERIVED CHART DATA
  // ==========================================================

  const costTrend = useMemo(
    () =>
      timeseriesData?.data?.map(
        (row) => ({
          x: row.date,
          y: Number(
            row.cost ?? 0,
          ),
        }),
      ) ?? [],
    [timeseriesData],
  );

  const tokenTrend = useMemo(
    () =>
      timeseriesData?.data?.map(
        (row) => ({
          x: row.date,
          y: Number(
            row.tokens ?? 0,
          ),
        }),
      ) ?? [],
    [timeseriesData],
  );

  const requestTrend = useMemo(
    () =>
      timeseriesData?.data?.map(
        (row) => ({
          x: row.date,
          y: Number(
            row.requests ?? 0,
          ),
        }),
      ) ?? [],
    [timeseriesData],
  );

  const providerPie = useMemo(() => {
    const colors = [
      "#3B82F6",
      "#8B5CF6",
      "#EC4899",
      "#F59E0B",
      "#10B981",
      "#6366F1",
      "#14B8A6",
      "#EF4444",
    ];

    return (
      providerData?.data
        ?.map(
          (item, index) => ({
            label: item.provider,
            value: Number(
              item.cost ?? 0,
            ),
            color:
              colors[
                index %
                  colors.length
              ],
          }),
        )
        .filter(
          (item) =>
            item.value > 0,
        ) ?? []
    );
  }, [providerData]);

  // ----------------------------------------------------------
  // CURRENT FILTER OBJECT
  // ----------------------------------------------------------

  const currentFilters: Filters =
    useMemo(
      () => ({
        organizationId,
        departmentId,
        projectId,
        environmentId,
        sdkKeyId,
        providerId,
      }),
      [
        organizationId,
        departmentId,
        projectId,
        environmentId,
        sdkKeyId,
        providerId,
      ],
    );

  // ----------------------------------------------------------
  // PROJECT DRILL-DOWN LINKS
  // ----------------------------------------------------------

  const projectBars = useMemo(
    () =>
      toBarItems(
        projectData?.data?.map(
          (item) => ({
            label: item.project,
            value: Number(
              item.cost ?? 0,
            ),
            secondary: `${formatCompact(
              item.tokens,
            )} tokens`,
            meta: `${formatNumber(
              item.requests,
            )} requests`,
            href: item.project_id
              ? buildDrilldownUrl(
                  timeFrame,
                  currentFilters,
                  {
                    organizationId,
                    departmentId,
                    projectId:
                      item.project_id,
                    environmentId: "",
                    sdkKeyId: "",
                  },
                )
              : undefined,
          }),
        ) ?? [],
      ),
    [
      projectData,
      timeFrame,
      currentFilters,
      organizationId,
      departmentId,
    ],
  );

  // ----------------------------------------------------------
  // ENVIRONMENT DRILL-DOWN LINKS
  // ----------------------------------------------------------

  const environmentBars = useMemo(
    () =>
      toBarItems(
        environmentData?.data?.map(
          (item) => ({
            label:
              item.environment,
            value: Number(
              item.cost ?? 0,
            ),
            secondary:
              item.project,
            meta: `${formatCompact(
              item.tokens,
            )} tokens · ${formatNumber(
              item.requests,
            )} requests`,
            href: item.environment_id
              ? buildDrilldownUrl(
                  timeFrame,
                  currentFilters,
                  {
                    projectId:
                      projectId,
                    environmentId:
                      item.environment_id,
                    sdkKeyId: "",
                  },
                )
              : undefined,
          }),
        ) ?? [],
      ),
    [
      environmentData,
      timeFrame,
      currentFilters,
      projectId,
    ],
  );

  // ----------------------------------------------------------
  // PROVIDER DRILL-DOWN LINKS
  // ----------------------------------------------------------

  const providerIdsByName =
    useMemo(
      () =>
        new Map(
          providers.map(
            (provider) => [
              provider.provider_name,
              provider.id,
            ],
          ),
        ),
      [providers],
    );

  const providerRequestBars =
    useMemo(
      () =>
        toBarItems(
          providerData?.data?.map(
            (item) => {
              const providerIdForDrilldown =
                providerIdsByName.get(
                  item.provider,
                );

              return {
                label: item.provider,
                value: Number(
                  item.requests ?? 0,
                ),
                secondary: `${formatCompact(
                  item.tokens,
                )} tokens`,
                meta: formatUsd(
                  item.cost,
                ),
                href:
                  providerIdForDrilldown
                    ? buildDrilldownUrl(
                        timeFrame,
                        currentFilters,
                        {
                          providerId:
                            providerIdForDrilldown,
                        },
                      )
                    : undefined,
              };
            },
          ) ?? [],
        ),
      [
        providerData,
        providerIdsByName,
        timeFrame,
        currentFilters,
      ],
    );

  // ----------------------------------------------------------
  // MODEL DATA
  // ----------------------------------------------------------

  const modelTokenBars =
    useMemo(
      () =>
        toBarItems(
          modelData?.data?.map(
            (item) => ({
              label: item.model,
              value: Number(
                item.tokens ?? 0,
              ),
              secondary:
                formatUsd(
                  item.cost,
                ),
              meta: `${formatNumber(
                item.requests,
              )} requests`,
            }),
          ) ?? [],
          10,
        ),
      [modelData],
    );

  // ----------------------------------------------------------
  // API KEY DRILL-DOWN LINKS
  // ----------------------------------------------------------

  const apiKeyBars = useMemo(
    () =>
      toBarItems(
        apiKeyData?.data?.map(
          (item) => ({
            label: item.api_key,
            value: Number(
              item.requests ?? 0,
            ),
            secondary: `${formatUsd(
              item.cost,
            )} spend`,
            meta: `${formatCompact(
              item.tokens,
            )} tokens`,
            href: item.sdk_key_id
              ? buildDrilldownUrl(
                  timeFrame,
                  currentFilters,
                  {
                    sdkKeyId:
                      item.sdk_key_id,
                  },
                )
              : undefined,
          }),
        ) ?? [],
        8,
      ),
    [
      apiKeyData,
      timeFrame,
      currentFilters,
    ],
  );

  // ----------------------------------------------------------
  // TOP MODELS
  // ----------------------------------------------------------

  const topModels = useMemo(
    () =>
      (
        modelData?.data ??
        []
      )
        .slice()
        .sort(
          (a, b) =>
            b.cost - a.cost,
        )
        .slice(0, 10),
    [modelData],
  );

  // ----------------------------------------------------------
  // EFFICIENCY
  // ----------------------------------------------------------

  const efficiencyRows =
    useMemo(
      () =>
        (
          efficiencyData?.data ??
          []
        )
          .slice()
          .sort(
            (a, b) =>
              a.cost_per_1k_tokens -
              b.cost_per_1k_tokens,
          )
          .slice(0, 10),
      [efficiencyData],
    );

  // ----------------------------------------------------------
  // STOP REASONS
  // ----------------------------------------------------------

  const stopReasons = useMemo(
    () =>
      (
        stopReasonData?.data ??
        []
      )
        .slice()
        .sort(
          (a, b) =>
            b.requests -
            a.requests,
        )
        .slice(0, 10),
    [stopReasonData],
  );

  // ----------------------------------------------------------
  // COST PER 1K
  // ----------------------------------------------------------

  const costPer1kTokens =
    useMemo(() => {
      const cost = Number(
        summaryData?.total_cost ??
          0,
      );

      const tokens = Number(
        summaryData?.total_tokens ??
          0,
      );

      return tokens > 0
        ? cost / (tokens / 1000)
        : 0;
    }, [summaryData]);

  // ==========================================================
  // SELECTED FILTER LABELS
  // ==========================================================

  const selectedOrganization =
    organizations.find(
      (item) =>
        item.id ===
        organizationId,
    );

  const selectedDepartment =
    departments.find(
      (item) =>
        item.id ===
        departmentId,
    );

  const selectedProject =
    projects.find(
      (item) =>
        item.id === projectId,
    );

  const selectedEnvironment =
    environments.find(
      (item) =>
        item.id ===
        environmentId,
    );

  const selectedSdkKey =
    sdkKeys.find(
      (item) =>
        item.id ===
        sdkKeyId,
    );

  const selectedProvider =
    providers.find(
      (item) =>
        item.id ===
        providerId,
    );

  const isDrilldown =
    Boolean(
      drilldownSource,
    );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-8">
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
            Analytics V2
          </div>

          <h1 className="mt-3 text-4xl font-bold text-gray-900">
            Analytics
          </h1>

          <p className="mt-2 max-w-2xl text-gray-600">
            Track AI usage, tokens, requests, spend and
            efficiency across your complete team hierarchy.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              "24h",
              "7d",
              "30d",
            ] as TimeFrame[]
          ).map(
            (value) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setTimeFrame(
                    value,
                  )
                }
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                  timeFrame ===
                  value
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
                }`}
              >
                {value.toUpperCase()}
              </button>
            ),
          )}
        </div>
      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">
            Filters
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Narrow every dashboard graph by organization,
            department, project, environment, API key and
            provider.
          </p>
        </div>

        {filterError ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {filterError}
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Organization */}

          <div>
            <label
              htmlFor="organization-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Organization
            </label>

            <select
              id="organization-filter"
              value={organizationId}
              onChange={(event) => {
                const value =
                  event.target.value;

                setOrganizationId(
                  value,
                );

                setDepartmentId(
                  "",
                );

                setProjectId(
                  "",
                );

                setEnvironmentId(
                  "",
                );

                setSdkKeyId(
                  "",
                );

                setFilterError(
                  null,
                );
              }}
              disabled={
                loadingOrganizations
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {loadingOrganizations
                  ? "Loading organizations..."
                  : "All Organizations"}
              </option>

              {organizations.map(
                (
                  organization,
                ) => (
                  <option
                    key={
                      organization.id
                    }
                    value={
                      organization.id
                    }
                  >
                    {
                      organization.name
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          {/* Department */}

          <div>
            <label
              htmlFor="department-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Department
            </label>

            <select
              id="department-filter"
              value={departmentId}
              onChange={(event) => {
                const value =
                  event.target.value;

                setDepartmentId(
                  value,
                );

                setProjectId(
                  "",
                );

                setEnvironmentId(
                  "",
                );

                setSdkKeyId(
                  "",
                );

                setFilterError(
                  null,
                );
              }}
              disabled={
                !organizationId ||
                loadingDepartments
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {!organizationId
                  ? "Select organization first"
                  : loadingDepartments
                    ? "Loading departments..."
                    : "All Departments"}
              </option>

              {departments.map(
                (
                  department,
                ) => (
                  <option
                    key={
                      department.id
                    }
                    value={
                      department.id
                    }
                  >
                    {department.name}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* Project */}

          <div>
            <label
              htmlFor="project-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Project
            </label>

            <select
              id="project-filter"
              value={projectId}
              onChange={(event) => {
                const value =
                  event.target.value;

                setProjectId(
                  value,
                );

                setEnvironmentId(
                  "",
                );

                setSdkKeyId(
                  "",
                );

                setFilterError(
                  null,
                );
              }}
              disabled={
                !departmentId ||
                loadingProjects
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {!departmentId
                  ? "Select department first"
                  : loadingProjects
                    ? "Loading projects..."
                    : "All Projects"}
              </option>

              {projects.map(
                (project) => (
                  <option
                    key={
                      project.id
                    }
                    value={
                      project.id
                    }
                  >
                    {
                      project.name
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          {/* Environment */}

          <div>
            <label
              htmlFor="environment-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Environment
            </label>

            <select
              id="environment-filter"
              value={environmentId}
              onChange={(event) => {
                const value =
                  event.target.value;

                setEnvironmentId(
                  value,
                );

                setSdkKeyId(
                  "",
                );

                setFilterError(
                  null,
                );
              }}
              disabled={
                !projectId ||
                loadingEnvironments
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {!projectId
                  ? "Select project first"
                  : loadingEnvironments
                    ? "Loading environments..."
                    : "All Environments"}
              </option>

              {environments.map(
                (
                  environment,
                ) => (
                  <option
                    key={
                      environment.id
                    }
                    value={
                      environment.id
                    }
                  >
                    {
                      environment.name
                    }
                  </option>
                ),
              )}
            </select>
          </div>

          {/* API Key */}

          <div>
            <label
              htmlFor="sdk-key-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              API Key
            </label>

            <select
              id="sdk-key-filter"
              value={sdkKeyId}
              onChange={(event) => {
                setSdkKeyId(
                  event.target.value,
                );

                setFilterError(
                  null,
                );
              }}
              disabled={
                !environmentId ||
                loadingSdkKeys
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              <option value="">
                {!environmentId
                  ? "Select environment first"
                  : loadingSdkKeys
                    ? "Loading API keys..."
                    : "All API Keys"}
              </option>

              {sdkKeys.map(
                (key) => (
                  <option
                    key={key.id}
                    value={key.id}
                  >
                    {key.name}
                    {key.revoked
                      ? " (revoked)"
                      : ""}
                  </option>
                ),
              )}
            </select>
          </div>

          {/* Provider */}

          <div>
            <label
              htmlFor="provider-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Provider
            </label>

            <select
              id="provider-filter"
              value={providerId}
              onChange={(event) => {
                setProviderId(
                  event.target.value,
                );

                setFilterError(
                  null,
                );
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">
                All Providers
              </option>

              {providers.map(
                (provider) => (
                  <option
                    key={
                      provider.id
                    }
                    value={
                      provider.id
                    }
                  >
                    {provider.display_name ||
                      provider.provider_name}
                  </option>
                ),
              )}
            </select>
          </div>
        </div>

        {/* ACTIVE FILTER CHIPS */}

        <div className="mt-5 flex flex-wrap gap-2">
          {selectedOrganization ? (
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
              Organization:{" "}
              {
                selectedOrganization.name
              }
            </span>
          ) : null}

          {selectedDepartment ? (
            <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
              Department:{" "}
              {
                selectedDepartment.name
              }
            </span>
          ) : null}

          {selectedProject ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
              Project:{" "}
              {
                selectedProject.name
              }
            </span>
          ) : null}

          {selectedEnvironment ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
              Environment:{" "}
              {
                selectedEnvironment.name
              }
            </span>
          ) : null}

          {selectedSdkKey ? (
            <span className="rounded-full bg-pink-50 px-3 py-1 text-xs font-medium text-pink-700">
              API Key:{" "}
              {
                selectedSdkKey.name
              }
            </span>
          ) : null}

          {selectedProvider ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              Provider:{" "}
              {
                selectedProvider.display_name ||
                  selectedProvider.provider_name
              }
            </span>
          ) : null}

          {isDrilldown ? (
            <a
              href="/dashboard/stats"
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Clear drill-down
            </a>
          ) : null}
        </div>
      </section>

      {/* ERROR */}

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* ======================================================
          SUMMARY
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Requests"
          value={
            loadingAnalytics
              ? "—"
              : formatNumber(
                  summaryData?.request_count ??
                    0,
                )
          }
          description="Total API requests"
        />

        <MetricCard
          label="Cost"
          value={
            loadingAnalytics
              ? "—"
              : formatUsd(
                  summaryData?.total_cost ??
                    0,
                )
          }
          description="Estimated AI spend"
        />

        <MetricCard
          label="Tokens"
          value={
            loadingAnalytics
              ? "—"
              : formatCompact(
                  summaryData?.total_tokens ??
                    0,
                )
          }
          description="Input + output tokens"
        />

        <MetricCard
          label="Input / Output"
          value={
            loadingAnalytics
              ? "—"
              : `${formatCompact(
                  summaryData?.input_tokens ??
                    0,
                )} / ${formatCompact(
                  summaryData?.output_tokens ??
                    0,
                )}`
          }
          description="Token direction split"
        />

        <MetricCard
          label="Cost / 1K"
          value={
            loadingAnalytics
              ? "—"
              : formatRate(
                  costPer1kTokens,
                )
          }
          description="Cost per 1K total tokens"
        />
      </div>

      {/* ======================================================
          COST + PROVIDERS
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-2">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Cost Trend
            </h2>

            <p className="text-sm text-slate-500">
              Daily AI spend for the selected filters.
            </p>
          </div>

          {loadingAnalytics ? (
            <LoadingBox
              height={320}
            />
          ) : costTrend.length ? (
            <LineChart
              points={
                costTrend
              }
              height={300}
              stroke="#3B82F6"
              valueFormat="usd"
            />
          ) : (
            <EmptyBox
              message="No cost data available."
              height={320}
            />
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Provider Cost Share
            </h2>

            <p className="text-sm text-slate-500">
              Cost distribution across providers.
            </p>
          </div>

          <div className="flex min-h-[320px] items-center justify-center">
            {loadingAnalytics ? (
              <LoadingBox
                height={320}
              />
            ) : providerPie.length ? (
              <PieChart
                data={
                  providerPie
                }
                size={280}
              />
            ) : (
              <EmptyBox
                message="No provider data available."
                height={320}
              />
            )}
          </div>
        </div>
      </div>

      {/* ======================================================
          TOKEN + REQUEST TRENDS
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Token Usage
            </h2>

            <p className="text-sm text-slate-500">
              Daily token consumption.
            </p>
          </div>

          {loadingAnalytics ? (
            <LoadingBox
              height={300}
            />
          ) : tokenTrend.length ? (
            <LineChart
              points={
                tokenTrend
              }
              height={280}
              stroke="#8B5CF6"
            />
          ) : (
            <EmptyBox
              message="No token data available."
              height={300}
            />
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Request Volume
            </h2>

            <p className="text-sm text-slate-500">
              Daily request count.
            </p>
          </div>

          {loadingAnalytics ? (
            <LoadingBox
              height={300}
            />
          ) : requestTrend.length ? (
            <LineChart
              points={
                requestTrend
              }
              height={280}
              stroke="#10B981"
            />
          ) : (
            <EmptyBox
              message="No request data available."
              height={300}
            />
          )}
        </div>
      </div>

      {/* ======================================================
          PROJECT / ENVIRONMENT / API KEY
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Cost by Project
            </h2>

            <p className="text-sm text-slate-500">
              Click a project to open filtered analytics.
            </p>
          </div>

          {loadingAnalytics ? (
            <LoadingBox
              height={240}
            />
          ) : (
            <HorizontalBars
              items={
                projectBars
              }
              valueFormatter={
                formatUsd
              }
              emptyMessage="No project cost data available."
            />
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Cost by Environment
            </h2>

            <p className="text-sm text-slate-500">
              Click an environment to open filtered analytics.
            </p>
          </div>

          {loadingAnalytics ? (
            <LoadingBox
              height={240}
            />
          ) : (
            <HorizontalBars
              items={
                environmentBars
              }
              valueFormatter={
                formatUsd
              }
              emptyMessage="No environment cost data available."
            />
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              API Key Activity
            </h2>

            <p className="text-sm text-slate-500">
              Click an API key to open filtered analytics.
            </p>
          </div>

          {loadingAnalytics ? (
            <LoadingBox
              height={240}
            />
          ) : (
            <HorizontalBars
              items={
                apiKeyBars
              }
              valueFormatter={
                formatNumber
              }
              emptyMessage="No API key activity available."
            />
          )}
        </div>
      </div>

      {/* ======================================================
          PROVIDERS + MODELS
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Requests by Provider
            </h2>

            <p className="text-sm text-slate-500">
              Click a provider to open filtered analytics.
            </p>
          </div>

          {loadingAnalytics ? (
            <LoadingBox
              height={280}
            />
          ) : (
            <HorizontalBars
              items={
                providerRequestBars
              }
              valueFormatter={
                formatNumber
              }
              emptyMessage="No provider request data available."
            />
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Tokens by Model
            </h2>

            <p className="text-sm text-slate-500">
              Models ranked by total token consumption.
            </p>
          </div>

          {loadingAnalytics ? (
            <LoadingBox
              height={280}
            />
          ) : (
            <HorizontalBars
              items={
                modelTokenBars
              }
              valueFormatter={
                formatCompact
              }
              emptyMessage="No model token data available."
            />
          )}
        </div>
      </div>

      {/* ======================================================
          TOP MODELS + EFFICIENCY
      ====================================================== */}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Top Expensive Models
            </h2>

            <p className="text-sm text-slate-500">
              Models ranked by total cost.
            </p>
          </div>

          {loadingAnalytics ? (
            <LoadingBox
              height={260}
            />
          ) : topModels.length ? (
            <div className="space-y-3">
              {topModels.map(
                (
                  item,
                  index,
                ) => (
                  <div
                    key={
                      item.model
                    }
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                          {
                            index +
                              1
                          }
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {
                              item.model
                            }
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {formatCompact(
                              item.tokens,
                            )}{" "}
                            tokens ·{" "}
                            {formatNumber(
                              item.requests,
                            )}{" "}
                            requests
                          </p>
                        </div>
                      </div>

                      <p className="shrink-0 font-semibold text-slate-900">
                        {formatUsd(
                          item.cost,
                        )}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          ) : (
            <EmptyBox
              message="No model cost data available."
              height={260}
            />
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-slate-900">
              Cost vs Token Efficiency
            </h2>

            <p className="text-sm text-slate-500">
              Lower cost per 1K tokens is more efficient.
            </p>
          </div>

          {loadingAnalytics ? (
            <LoadingBox
              height={260}
            />
          ) : efficiencyRows.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-[0.1em] text-slate-500">
                    <th className="px-2 py-3">
                      Model
                    </th>

                    <th className="px-2 py-3 text-right">
                      Tokens
                    </th>

                    <th className="px-2 py-3 text-right">
                      Cost
                    </th>

                    <th className="px-2 py-3 text-right">
                      $/1K
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {efficiencyRows.map(
                    (item) => (
                      <tr
                        key={`${item.model}-${item.cost_per_1k_tokens}`}
                        className="border-b border-slate-100 last:border-0"
                      >
                        <td className="max-w-[180px] truncate px-2 py-3 font-medium text-slate-800">
                          {
                            item.model
                          }
                        </td>

                        <td className="px-2 py-3 text-right text-slate-600">
                          {formatCompact(
                            item.tokens,
                          )}
                        </td>

                        <td className="px-2 py-3 text-right text-slate-700">
                          {formatUsd(
                            item.cost,
                          )}
                        </td>

                        <td className="px-2 py-3 text-right font-semibold text-slate-900">
                          {formatRate(
                            item.cost_per_1k_tokens,
                          )}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyBox
              message="No efficiency data available."
              height={260}
            />
          )}
        </div>
      </div>

      {/* ======================================================
          STOP REASONS
      ====================================================== */}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Stop Reasons
          </h2>

          <p className="text-sm text-slate-500">
            Request completion reasons in the selected range.
          </p>
        </div>

        {loadingAnalytics ? (
          <LoadingBox
            height={180}
          />
        ) : stopReasons.length ? (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            {stopReasons.map(
              (item) => (
                <div
                  key={
                    item.reason
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                >
                  <p className="truncate text-sm font-medium text-slate-800">
                    {
                      item.reason
                    }
                  </p>

                  <p className="mt-2 text-2xl font-semibold text-slate-900">
                    {formatNumber(
                      item.requests,
                    )}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    requests
                  </p>
                </div>
              ),
            )}
          </div>
        ) : (
          <EmptyBox
            message="No stop-reason data available."
            height={180}
          />
        )}
      </div>

      {/* ======================================================
          TOKEN BREAKDOWN
      ====================================================== */}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Input Tokens"
          value={
            loadingAnalytics
              ? "—"
              : formatCompact(
                  summaryData?.input_tokens ??
                    0,
                )
          }
          description="Prompt tokens"
        />

        <MetricCard
          label="Output Tokens"
          value={
            loadingAnalytics
              ? "—"
              : formatCompact(
                  summaryData?.output_tokens ??
                    0,
                )
          }
          description="Completion tokens"
        />

        <MetricCard
          label="Total Tokens"
          value={
            loadingAnalytics
              ? "—"
              : formatCompact(
                  summaryData?.total_tokens ??
                    0,
                )
          }
          description="Combined token volume"
        />
      </div>

      {/* ======================================================
          RECENT REQUESTS
      ====================================================== */}

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Recent Requests
          </h2>

          <p className="text-sm text-slate-500">
            Recent AI requests matching the selected filters.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs uppercase tracking-[0.12em] text-slate-500">
                <th className="px-4 py-3">
                  Time
                </th>

                <th className="px-4 py-3">
                  Provider
                </th>

                <th className="px-4 py-3">
                  Model
                </th>

                <th className="px-4 py-3">
                  Tokens
                </th>

                <th className="px-4 py-3">
                  Cost
                </th>

                <th className="px-4 py-3">
                  Stop Reason
                </th>
              </tr>
            </thead>

            <tbody>
              {requestRows.map(
                (
                  row,
                  index,
                ) => {
                  const timestamp =
                    row.created_at ||
                    row.fetched_at ||
                    null;

                  const tokens =
                    Number(
                      row.total_tokens ??
                        0,
                    ) ||
                    Number(
                      row.input_tokens ??
                        0,
                    ) +
                      Number(
                        row.output_tokens ??
                          0,
                      );

                  return (
                    <tr
                      key={`${row.request_id ?? "request"}-${timestamp ?? index}`}
                      className="border-t border-slate-200"
                    >
                      <td className="whitespace-nowrap px-4 py-4 text-slate-600">
                        {formatDate(
                          timestamp,
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {
                          row.provider
                        }
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {
                          row.model
                        }
                      </td>

                      <td className="px-4 py-4 text-slate-700">
                        {formatCompact(
                          tokens,
                        )}
                      </td>

                      <td className="px-4 py-4 font-semibold text-slate-900">
                        {formatUsd(
                          row.total_cost_usd,
                        )}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {
                          row.stop_reason ||
                          "n/a"
                        }
                      </td>
                    </tr>
                  );
                },
              )}

              {!loadingAnalytics &&
              requestRows.length ===
                0 ? (
                <tr>
                  <td
                    colSpan={
                      6
                    }
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No requests found
                    for the selected
                    filters.
                  </td>
                </tr>
              ) : null}

              {loadingAnalytics ? (
                <tr>
                  <td
                    colSpan={
                      6
                    }
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Loading requests...
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}