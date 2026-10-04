import { NextResponse } from "next/server";

import {
  decryptProviderSecret,
  encryptProviderSecret,
  isEncryptedProviderSecret,
} from "@/lib/crypto";
import { fetchOpenAIUsageRecord} from "@/lib/providers/openai";
import { fetchAnthropicUsageRecord } from "@/lib/providers/anthropic";
import { fetchAwsUsageRecord } from "@/lib/providers/aws";
import { fetchGcpUsageRecord } from "@/lib/providers/gcp";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { computeCosts } from "@/lib/analysis/computeCosts";
import {
  sendAmberAlert,
  sendRedAlert,
  type AlertUser,
} from "@/lib/email";

// ============================================================
// TYPES
// ============================================================

type ProviderAdapter = (params: {
  userId: string;
  providerId: string;
  date: string;
  apiKey: string;
}) => Promise<{
  user_id: string;
  provider_id: string;
  date: string;
  total_cost_usd: number;
  total_tokens: number;
  request_count: number;
  raw_response: unknown;
}>;

type ProviderRow = {
  id: string;
  user_id: string;
  provider_name: string;
  is_active: boolean;
};

type ProviderCredentialRow = {
  id: string;
  project_id: string;
  environment_id: string | null;
  provider_name: string;
  secret_ref: string;
  status: string;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProjectRow = {
  id: string;
  department_id: string;
};

type DepartmentRow = {
  id: string;
  organization_id: string;
};

type OrganizationRow = {
  id: string;
  owner_user_id: string | null;
};

type CredentialContext = {
  organizationId: string | null;
  projectId: string;
  environmentId: string | null;
  userId: string | null;
};

// ============================================================
// AUTH
// ============================================================

function unauthorizedResponse() {
  return NextResponse.json(
    {
      error: "Unauthorized",
    },
    {
      status: 401,
    }
  );
}

function isAuthorized(
  authHeader: string | null
): boolean {
  const cronSecret =
    process.env.CRON_SECRET;

  if (!cronSecret) {
    throw new Error(
      "Missing CRON_SECRET"
    );
  }

  return (
    authHeader ===
    `Bearer ${cronSecret}`
  );
}

// ============================================================
// PROVIDER ADAPTERS
// ============================================================

const adapterByProviderName: Record<
  string,
  ProviderAdapter
> = {
  openai:
    fetchOpenAIUsageRecord,

  anthropic:
    fetchAnthropicUsageRecord,

  aws:
    fetchAwsUsageRecord,

  bedrock:
    fetchAwsUsageRecord,

  gcp:
    fetchGcpUsageRecord,

  vertex:
    fetchGcpUsageRecord,
};

// ============================================================
// LOAD PROJECT / ORGANIZATION CONTEXT
// ============================================================

async function loadProjectContexts(
  projectIds: string[]
): Promise<Map<string, CredentialContext>> {
  const result =
    new Map<
      string,
      CredentialContext
    >();

  if (!projectIds.length) {
    return result;
  }

  const {
    data: projects,
    error: projectsError,
  } = await supabaseAdmin
    .from("projects")
    .select(
      "id, department_id"
    )
    .in(
      "id",
      projectIds
    );

  if (projectsError) {
    throw new Error(
      `Failed to load projects: ${projectsError.message}`
    );
  }

  const projectRows =
    (projects ??
      []) as ProjectRow[];

  const departmentIds =
    Array.from(
      new Set(
        projectRows.map(
          (project) =>
            project.department_id
        )
      )
    );

  if (!departmentIds.length) {
    return result;
  }

  const {
    data: departments,
    error: departmentsError,
  } = await supabaseAdmin
    .from("departments")
    .select(
      "id, organization_id"
    )
    .in(
      "id",
      departmentIds
    );

  if (departmentsError) {
    throw new Error(
      `Failed to load departments: ${departmentsError.message}`
    );
  }

  const departmentRows =
    (departments ??
      []) as DepartmentRow[];

  const organizationIds =
    Array.from(
      new Set(
        departmentRows.map(
          (department) =>
            department.organization_id
        )
      )
    );

  const organizationById =
    new Map<
      string,
      OrganizationRow
    >();

  if (organizationIds.length) {
    const {
      data: organizations,
      error: organizationsError,
    } = await supabaseAdmin
      .from("organizations")
      .select(
        "id, owner_user_id"
      )
      .in(
        "id",
        organizationIds
      );

    if (organizationsError) {
      throw new Error(
        `Failed to load organizations: ${organizationsError.message}`
      );
    }

    for (const organization of
      (organizations ??
        []) as OrganizationRow[]) {
      organizationById.set(
        organization.id,
        organization
      );
    }
  }

  const departmentById =
    new Map<
      string,
      DepartmentRow
    >();

  for (const department of
    departmentRows) {
    departmentById.set(
      department.id,
      department
    );
  }

  for (const project of
    projectRows) {
    const department =
      departmentById.get(
        project.department_id
      );

    const organization =
      department
        ? organizationById.get(
            department.organization_id
          )
        : undefined;

    result.set(
      project.id,
      {
        organizationId:
          department?.organization_id ??
          null,

        projectId:
          project.id,

        environmentId:
          null,

        userId:
          organization?.owner_user_id ??
          null,
      }
    );
  }

  return result;
}

// ============================================================
// SAVE CRON USAGE
// ============================================================

async function upsertUsageRecordCron(
  params: {
    userId: string;
    providerId: string;
    date: string;
    total_cost_usd: number;
    total_tokens: number;
    request_count: number;
    raw_response: unknown;

    organizationId?: string | null;
    projectId?: string | null;
    environmentId?: string | null;
    providerCredentialId?: string | null;
  }
) {
  const {
    data: existing,
    error: existingError,
  } = await supabaseAdmin
    .from("usage_records")
    .select("id")
    .eq(
      "user_id",
      params.userId
    )
    .eq(
      "provider_id",
      params.providerId
    )
    .eq(
      "date",
      params.date
    )
    .eq(
      "source",
      "cron"
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      existingError.message
    );
  }

  const payload = {
    user_id:
      params.userId,

    provider_id:
      params.providerId,

    date:
      params.date,

    total_cost_usd:
      params.total_cost_usd,

    total_tokens:
      params.total_tokens,

    request_count:
      params.request_count,

    raw_response:
      params.raw_response,

    source:
      "cron",

    organization_id:
      params.organizationId ??
      null,

    project_id:
      params.projectId ??
      null,

    environment_id:
      params.environmentId ??
      null,

    provider_credential_id:
      params.providerCredentialId ??
      null,
  };

  if (existing?.id) {
    const {
      error: updateError,
    } = await supabaseAdmin
      .from("usage_records")
      .update(payload)
      .eq(
        "id",
        existing.id
      );

    if (updateError) {
      throw new Error(
        updateError.message
      );
    }

    return;
  }

  const {
    error: insertError,
  } = await supabaseAdmin
    .from("usage_records")
    .insert(payload);

  if (insertError) {
    throw new Error(
      insertError.message
    );
  }
}

// ============================================================
// MAIN CRON
// ============================================================

export async function GET(
  request: Request
) {
  try {
    if (
      !isAuthorized(
        request.headers.get(
          "Authorization"
        )
      )
    ) {
      return unauthorizedResponse();
    }

    const now =
      new Date();

    const date =
      now
        .toISOString()
        .slice(0, 10);

    const monthYear =
      `${now.getUTCFullYear()}-${String(
        now.getUTCMonth() + 1
      ).padStart(2, "0")}`;

    const monthStart =
      new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          1,
          0,
          0,
          0
        )
      )
        .toISOString()
        .slice(0, 10);

    const monthEnd =
      new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth() + 1,
          1,
          0,
          0,
          0
        )
      )
        .toISOString()
        .slice(0, 10);

    const {
      data: providers,
      error: providersError,
    } = await supabaseAdmin
      .from("providers")
      .select(
        "id, user_id, provider_name, is_active"
      )
      .eq(
        "is_active",
        true
      );

    if (providersError) {
      return NextResponse.json(
        {
          error:
            `Failed to load providers: ${providersError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    const activeProviders =
      (providers ??
        []) as ProviderRow[];

    const {
      data: credentialRows,
      error: credentialsError,
    } = await supabaseAdmin
      .from(
        "provider_credentials"
      )
      .select(
        `
          id,
          project_id,
          environment_id,
          provider_name,
          secret_ref,
          status,
          created_by,
          created_at,
          updated_at
        `
      )
      .eq(
        "status",
        "active"
      );

    if (credentialsError) {
      return NextResponse.json(
        {
          error:
            `Failed to load provider credentials: ${credentialsError.message}`,
        },
        {
          status: 500,
        }
      );
    }

    const credentials =
      (credentialRows ??
        []) as ProviderCredentialRow[];

    const projectIds =
      Array.from(
        new Set(
          credentials.map(
            (credential) =>
              credential.project_id
          )
        )
      );

    const projectContexts =
      await loadProjectContexts(
        projectIds
      );

    const providerByUserAndName =
      new Map<
        string,
        ProviderRow
      >();

    for (const provider of
      activeProviders) {
      providerByUserAndName.set(
        `${provider.user_id}:${provider.provider_name.toLowerCase()}`,
        provider
      );
    }

    const credentialTargets =
      new Map<
        string,
        {
          provider:
            ProviderRow;
          credential:
            ProviderCredentialRow;
          context:
            CredentialContext;
        }
      >();

    for (const credential of
      credentials) {
      const context =
        projectContexts.get(
          credential.project_id
        );

      if (!context) {
        continue;
      }

      const userId =
        context.userId ??
        credential.created_by ??
        null;

      if (!userId) {
        continue;
      }

      const key =
        `${userId}:${credential.provider_name.toLowerCase()}`;

      const provider =
        providerByUserAndName.get(
          key
        );

      if (!provider) {
        continue;
      }

      const current =
        credentialTargets.get(
          key
        );

      if (!current) {
        credentialTargets.set(
          key,
          {
            provider,
            credential,
            context: {
              ...context,
              userId,
              environmentId:
                credential.environment_id,
            },
          }
        );

        continue;
      }

      const currentTime =
        current.credential
          .updated_at ||
        current.credential
          .created_at ||
        "";

      const candidateTime =
        credential.updated_at ||
        credential.created_at ||
        "";

      if (
        candidateTime >
        currentTime
      ) {
        credentialTargets.set(
          key,
          {
            provider,
            credential,
            context: {
              ...context,
              userId,
              environmentId:
                credential.environment_id,
            },
          }
        );
      }
    }

    const results: Array<{
      providerId: string;
      providerName: string;
      credentialId?: string;
      ok: boolean;
      error?: string;
    }> = [];

    for (const [
      ,
      target,
    ] of credentialTargets) {
      try {
        const provider =
          target.provider;

        const credential =
          target.credential;

        const context =
          target.context;

        const adapter =
          adapterByProviderName[
            provider.provider_name.toLowerCase()
          ];

        if (!adapter) {
          throw new Error(
            `No billing adapter for provider_name=${provider.provider_name}`
          );
        }

        // Provider secrets are encrypted at rest. Legacy plaintext
        // credentials are still accepted once so they can be migrated
        // without breaking existing integrations.
        const storedSecret =
          credential.secret_ref?.trim();

        if (!storedSecret) {
          throw new Error(
            "Provider credential does not contain a usable secret."
          );
        }

        const apiKey =
          decryptProviderSecret(storedSecret);

        if (!apiKey.trim()) {
          throw new Error(
            "Provider credential does not contain a usable secret."
          );
        }

        if (!isEncryptedProviderSecret(storedSecret)) {
          try {
            const encryptedSecret =
              encryptProviderSecret(apiKey);

            const { error: migrationError } =
              await supabaseAdmin
                .from("provider_credentials")
                .update({
                  secret_ref: encryptedSecret,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", credential.id);

            if (migrationError) {
              console.error(
                "Failed to migrate legacy provider credential:",
                migrationError.message
              );
            }
          } catch (migrationError) {
            console.error(
              "Failed to encrypt legacy provider credential:",
              migrationError
            );
          }
        }

        const usageRecord =
          await adapter({
            userId:
              provider.user_id,

            providerId:
              provider.id,

            date,

            apiKey,
          });

        await upsertUsageRecordCron({
          userId:
            provider.user_id,

          providerId:
            provider.id,

          date,

          total_cost_usd:
            usageRecord.total_cost_usd,

          total_tokens:
            usageRecord.total_tokens,

          request_count:
            usageRecord.request_count,

          raw_response:
            usageRecord.raw_response,

          organizationId:
            context.organizationId,

          projectId:
            context.projectId,

          environmentId:
            context.environmentId,

          providerCredentialId:
            credential.id,
        });

        results.push({
          providerId:
            provider.id,

          providerName:
            provider.provider_name,

          credentialId:
            credential.id,

          ok: true,
        });
      } catch (error) {
        results.push({
          providerId:
            target.provider.id,

          providerName:
            target.provider
              .provider_name,

          credentialId:
            target.credential.id,

          ok: false,

          error:
            error instanceof Error
              ? error.message
              : "Unknown error",
        });
      }
    }

    try {
      await computeCosts();
    } catch {
      // Cost computation should not make the entire
      // scheduled billing job fail.
    }

    const userIds =
      Array.from(
        new Set(
          activeProviders.map(
            (provider) =>
              provider.user_id
          )
        )
      );

    if (!userIds.length) {
      return NextResponse.json({
        processed:
          results.length,

        succeeded:
          results.filter(
            (result) =>
              result.ok
          ).length,

        failed:
          results.filter(
            (result) =>
              !result.ok
          ).length,

        alerts_sent: 0,
      });
    }

    const [
      usageRowsRes,
      budgetsRes,
      alertsRes,
      profilesRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("usage_records")
        .select(
          "user_id,total_cost_usd"
        )
        .gte(
          "date",
          monthStart
        )
        .lt(
          "date",
          monthEnd
        )
        .in(
          "user_id",
          userIds
        ),

      supabaseAdmin
        .from("budgets")
        .select(
          "user_id,monthly_limit_usd,alert_threshold_pct"
        )
        .in(
          "user_id",
          userIds
        ),

      supabaseAdmin
        .from("alert_logs")
        .select(
          "user_id,month_year"
        )
        .eq(
          "month_year",
          monthYear
        )
        .in(
          "user_id",
          userIds
        ),

      supabaseAdmin
        .from("profiles")
        .select(
          "id,email,full_name"
        )
        .in(
          "id",
          userIds
        ),
    ]);

    const usageRows =
      (usageRowsRes.data ??
        []) as Array<{
        user_id: string;
        total_cost_usd:
          number | null;
      }>;

    const budgets =
      (budgetsRes.data ??
        []) as Array<{
        user_id: string;
        monthly_limit_usd:
          number | null;
        alert_threshold_pct:
          number | null;
      }>;

    const alerts =
      (alertsRes.data ??
        []) as Array<{
        user_id: string;
      }>;

    const profiles =
      (profilesRes.data ??
        []) as Array<{
        id: string;
        email:
          | string
          | null;
        full_name:
          | string
          | null;
      }>;

    const spendByUser =
      new Map<string, number>();

    for (const row of
      usageRows) {
      if (
        row.total_cost_usd ==
        null
      ) {
        continue;
      }

      spendByUser.set(
        row.user_id,
        (spendByUser.get(
          row.user_id
        ) ?? 0) +
          Number(
            row.total_cost_usd
          )
      );
    }

    const limitByUser =
      new Map<string, number>();

    const thresholdByUser =
      new Map<string, number>();

    for (const budget of
      budgets) {
      if (
        budget.monthly_limit_usd ==
        null
      ) {
        continue;
      }

      limitByUser.set(
        budget.user_id,
        (limitByUser.get(
          budget.user_id
        ) ?? 0) +
          Number(
            budget.monthly_limit_usd
          )
      );

      if (
        budget.alert_threshold_pct !=
        null
      ) {
        const value =
          Number(
            budget.alert_threshold_pct
          );

        const existing =
          thresholdByUser.get(
            budget.user_id
          );

        thresholdByUser.set(
          budget.user_id,
          existing == null
            ? value
            : Math.min(
                existing,
                value
              )
        );
      }
    }

    const alertedThisMonth =
      new Set(
        alerts.map(
          (alert) =>
            alert.user_id
        )
      );

    const profileById =
      new Map<
        string,
        AlertUser
      >(
        profiles.map(
          (profile) => [
            profile.id,
            {
              email:
                profile.email ??
                "",

              full_name:
                profile.full_name ??
                null,
            } as AlertUser,
          ]
        )
      );

    let alerts_sent = 0;

    for (const userId of
      userIds) {
      const spend =
        spendByUser.get(
          userId
        ) ?? 0;

      const limit =
        limitByUser.get(
          userId
        ) ?? 0;

      const thresholdPct =
        thresholdByUser.get(
          userId
        ) ?? 100;

      if (limit <= 0) {
        continue;
      }

      const pct =
        (spend / limit) *
        100;

      const shouldAlert =
        pct >=
        thresholdPct;

      if (!shouldAlert) {
        continue;
      }

      if (
        alertedThisMonth.has(
          userId
        )
      ) {
        continue;
      }

      const profile =
        profileById.get(
          userId
        );

      if (
        !profile ||
        !profile.email
      ) {
        continue;
      }

      const alertType:
        | "amber"
        | "red" =
        pct >= 100
          ? "red"
          : "amber";

      const message =
        `Spend ${spend.toFixed(
          2
        )} exceeded threshold: ${thresholdPct}% (${pct.toFixed(
          0
        )}%) with monthly limit ${limit.toFixed(
          2
        )}.`;

      const {
        error:
          alertInsertError,
      } = await supabaseAdmin
        .from("alert_logs")
        .insert({
          user_id:
            userId,

          alert_type:
            alertType,

          message,

          sent_at:
            now.toISOString(),

          month_year:
            monthYear,
        });

      if (
        !alertInsertError
      ) {
        try {
          if (
            alertType ===
            "red"
          ) {
            await sendRedAlert(
              profile,
              spend,
              limit
            );
          } else {
            await sendAmberAlert(
              profile,
              spend,
              limit,
              pct
            );
          }

          alerts_sent++;
        } catch {
          // Email failures do not fail the cron job.
        }
      }
    }

    const succeeded =
      results.filter(
        (result) =>
          result.ok
      ).length;

    const failed =
      results.filter(
        (result) =>
          !result.ok
      ).length;

    return NextResponse.json({
      processed:
        results.length,

      succeeded,

      failed,

      alerts_sent,

      results,
    });
  } catch (error) {
    console.error(
      "❌ Usage cron failed:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to process usage cron.",
      },
      {
        status: 500,
      }
    );
  }
}
