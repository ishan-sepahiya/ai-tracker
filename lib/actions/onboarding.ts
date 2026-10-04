"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { saveProvider } from "@/lib/providers/repository";
import { requireUser } from "@/lib/auth/server";

export type OnboardingProviderInput = {
  providerName:
    | "openai"
    | "bedrock"
    | "vertex"
    | "anthropic"
    | "other";

  displayName: string;

  /**
   * Kept as an optional compatibility field for older onboarding
   * callers. Provider secrets are no longer stored in the
   * `providers` table.
   *
   * Configure provider credentials through:
   * API Management → Provider Credentials.
   */
  apiKey?: string;
};

// ============================================================
// CONNECT AI PROVIDERS
// ============================================================

export async function connectAIProviders(input: {
  providers: OnboardingProviderInput[];
}) {
  const { userId } = await requireUser();

  if (!input.providers?.length) {
    throw new Error(
      "Select at least one provider"
    );
  }

  for (const provider of input.providers) {
    const providerName =
      provider.providerName;

    const displayName =
      provider.displayName?.trim() ||
      providerName;

    if (!providerName) {
      throw new Error(
        "Provider name is required"
      );
    }

    // --------------------------------------------------------
    // Provider records now store metadata only.
    //
    // API secrets belong to provider_credentials and are
    // managed from API Management where they can be scoped
    // to a project/environment.
    // --------------------------------------------------------

    await saveProvider({
      userId,
      providerName,
      displayName,
      isActive: true,
    });
  }

  return {
    success: true,
    message:
      "Provider metadata connected. Configure provider credentials from API Management.",
  };
}

// ============================================================
// SET MONTHLY BUDGET
// ============================================================

export async function setMonthlyBudget(input: {
  monthlyLimitUsd: number;

  providerNames:
    OnboardingProviderInput["providerName"][];
}) {
  const { userId } =
    await requireUser();

  if (
    !Number.isFinite(
      input.monthlyLimitUsd
    ) ||
    input.monthlyLimitUsd < 0
  ) {
    throw new Error(
      "Invalid monthly budget"
    );
  }

  if (!input.providerNames?.length) {
    throw new Error(
      "Select at least one provider"
    );
  }

  // ----------------------------------------------------------
  // Find provider IDs
  // ----------------------------------------------------------

  const {
    data: providerRows,
    error: providerError,
  } = await supabaseAdmin
    .from("providers")
    .select(
      "id, provider_name"
    )
    .eq(
      "user_id",
      userId
    )
    .in(
      "provider_name",
      input.providerNames
    );

  if (providerError) {
    throw new Error(
      providerError.message
    );
  }

  const providers =
    (providerRows ?? []).filter(
      (
        row
      ): row is {
        id: string;
        provider_name: string;
      } =>
        !!row?.id
    );

  if (!providers.length) {
    throw new Error(
      "No providers found to budget"
    );
  }

  const providerIds =
    providers.map(
      (provider) =>
        provider.id
    );

  // ----------------------------------------------------------
  // Find existing budgets
  // ----------------------------------------------------------

  const {
    data: existingBudgets,
    error: budgetsError,
  } = await supabaseAdmin
    .from("budgets")
    .select(
      "id, provider_id"
    )
    .eq(
      "user_id",
      userId
    )
    .in(
      "provider_id",
      providerIds
    );

  if (budgetsError) {
    throw new Error(
      budgetsError.message
    );
  }

  const existingByProviderId =
    new Map<string, string>();

  for (const row of
    existingBudgets ?? []) {
    if (
      row?.provider_id &&
      row?.id
    ) {
      existingByProviderId.set(
        row.provider_id,
        row.id
      );
    }
  }

  const defaultThresholdPct =
    80;

  // ----------------------------------------------------------
  // Create / update budgets
  // ----------------------------------------------------------

  for (const provider of
    providers) {
    const budgetId =
      existingByProviderId.get(
        provider.id
      );

    if (budgetId) {
      const {
        error: updateError,
      } = await supabaseAdmin
        .from("budgets")
        .update({
          monthly_limit_usd:
            input.monthlyLimitUsd,

          // Keep the existing alert
          // threshold unchanged.
        })
        .eq(
          "id",
          budgetId
        );

      if (updateError) {
        throw new Error(
          updateError.message
        );
      }
    } else {
      const {
        error: insertError,
      } = await supabaseAdmin
        .from("budgets")
        .insert({
          user_id: userId,
          provider_id:
            provider.id,
          monthly_limit_usd:
            input.monthlyLimitUsd,
          alert_threshold_pct:
            defaultThresholdPct,
        });

      if (insertError) {
        throw new Error(
          insertError.message
        );
      }
    }
  }
}

// ============================================================
// TRY UPDATE EMAIL TOGGLE
// ============================================================

async function tryUpdateEmailToggleOnBudgets(
  input: {
    userId: string;
    providerIds: string[];
    enabled: boolean;
  }
) {
  // We do not know the exact email-toggle column in the
  // current database schema, so try the supported candidates.
  const candidateColumns = [
    "email_notifications_enabled",
    "email_notification_enabled",
    "email_alerts_enabled",
    "email_enabled",
    "notifications_email_enabled",
    "notify_by_email",
  ] as const;

  for (const column of
    candidateColumns) {
    const {
      error,
    } = await supabaseAdmin
      .from("budgets")
      .update({
        [column]:
          input.enabled,
      })
      .eq(
        "user_id",
        input.userId
      )
      .in(
        "provider_id",
        input.providerIds
      );

    if (!error) {
      return;
    }

    const message =
      error.message
        ?.toLowerCase?.() ??
      "";

    if (
      message.includes("column") &&
      message.includes(
        "does not exist"
      )
    ) {
      continue;
    }

    throw new Error(
      error.message
    );
  }
}

// ============================================================
// SAVE NOTIFICATION PREFERENCES
// ============================================================

export async function saveNotificationPreferences(
  input: {
    providerNames:
      OnboardingProviderInput["providerName"][];

    alertThresholdPct: number;

    emailEnabled: boolean;
  }
) {
  const { userId } =
    await requireUser();

  if (
    !Number.isFinite(
      input.alertThresholdPct
    )
  ) {
    throw new Error(
      "Invalid threshold percent"
    );
  }

  const thresholdPct =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          input.alertThresholdPct
        )
      )
    );

  if (!input.providerNames?.length) {
    throw new Error(
      "Select at least one provider"
    );
  }

  // ----------------------------------------------------------
  // Find providers
  // ----------------------------------------------------------

  const {
    data: providerRows,
    error: providerError,
  } = await supabaseAdmin
    .from("providers")
    .select(
      "id, provider_name"
    )
    .eq(
      "user_id",
      userId
    )
    .in(
      "provider_name",
      input.providerNames
    );

  if (providerError) {
    throw new Error(
      providerError.message
    );
  }

  const providers =
    (providerRows ?? []).filter(
      (
        row
      ): row is {
        id: string;
        provider_name: string;
      } =>
        !!row?.id
    );

  if (!providers.length) {
    throw new Error(
      "No providers found"
    );
  }

  const providerIds =
    providers.map(
      (provider) =>
        provider.id
    );

  // ----------------------------------------------------------
  // Update threshold
  // ----------------------------------------------------------

  const {
    error: thresholdError,
  } = await supabaseAdmin
    .from("budgets")
    .update({
      alert_threshold_pct:
        thresholdPct,
    })
    .eq(
      "user_id",
      userId
    )
    .in(
      "provider_id",
      providerIds
    );

  if (thresholdError) {
    throw new Error(
      thresholdError.message
    );
  }

  // ----------------------------------------------------------
  // Best-effort email notification setting
  // ----------------------------------------------------------

  await tryUpdateEmailToggleOnBudgets({
    userId,
    providerIds,
    enabled:
      input.emailEnabled,
  });
}

// ============================================================
// MARK ONBOARDING COMPLETE
// ============================================================

export async function markOnboardingComplete(
  selectedPlan: string
) {
  const { userId } =
    await requireUser();

  // ----------------------------------------------------------
  // Validate plan
  // ----------------------------------------------------------

  const validPlans = [
    "trial",
    "professional",
    "enterprise",
  ];

  if (
    !validPlans.includes(
      selectedPlan
    )
  ) {
    throw new Error(
      "Invalid plan selected"
    );
  }

  // ----------------------------------------------------------
  // Update profile
  // ----------------------------------------------------------

  const {
    data,
    error,
  } = await supabaseAdmin
    .from("profiles")
    .update({
      onboarding_completed:
        true,

      selected_plan:
        selectedPlan,
    })
    .eq(
      "id",
      userId
    )
    .select()
    .single();

  if (error) {
    console.error(
      "Error marking onboarding complete:",
      error
    );

    throw error;
  }

  return {
    success: true,
    data,
  };
}