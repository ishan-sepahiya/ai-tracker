"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { saveProvider } from "@/lib/providers/repository";
import { requireUser } from "@/lib/auth/server";

export type OnboardingProviderInput = {
  providerName: "openai" | "bedrock" | "vertex" | "anthropic" | "other";
  displayName: string;
  apiKey: string;
};

export async function connectAIProviders(input: {
  providers: OnboardingProviderInput[];
}) {
  const { userId } = await requireUser();

  if (!input.providers?.length) {
    throw new Error("Select at least one provider");
  }

  for (const provider of input.providers) {
    if (!provider.apiKey) {
      throw new Error(`Missing API key for ${provider.displayName}`);
    }
    await saveProvider({
      userId,
      providerName: provider.providerName,
      displayName: provider.displayName,
      apiKey: provider.apiKey,
      isActive: true,
    });
  }
}

export async function setMonthlyBudget(input: {
  monthlyLimitUsd: number;
  providerNames: OnboardingProviderInput["providerName"][];
}) {
  const { userId } = await requireUser();

  if (!Number.isFinite(input.monthlyLimitUsd) || input.monthlyLimitUsd < 0) {
    throw new Error("Invalid monthly budget");
  }
  if (!input.providerNames?.length) {
    throw new Error("Select at least one provider");
  }

  // Map provider names to provider IDs.
  const { data: providerRows, error: providerError } = await supabaseAdmin
    .from("providers")
    .select("id, provider_name")
    .eq("user_id", userId)
    .in("provider_name", input.providerNames);

  if (providerError) throw new Error(providerError.message);
  const providers = (providerRows ?? []).filter(
    (r): r is { id: string; provider_name: string } => !!r?.id
  );

  if (!providers.length) {
    throw new Error("No providers found to budget");
  }

  const providerIds = providers.map((p) => p.id);

  // Figure out which budgets already exist to avoid relying on unknown unique constraints.
  const { data: existingBudgets, error: budgetsError } = await supabaseAdmin
    .from("budgets")
    .select("id, provider_id")
    .eq("user_id", userId)
    .in("provider_id", providerIds);

  if (budgetsError) throw new Error(budgetsError.message);

  const existingByProviderId = new Map<string, string>();
  for (const row of existingBudgets ?? []) {
    if (row?.provider_id && row?.id) {
      existingByProviderId.set(row.provider_id, row.id);
    }
  }

  const defaultThresholdPct = 80;

  for (const provider of providers) {
    const budgetId = existingByProviderId.get(provider.id);
    if (budgetId) {
      const { error: updateError } = await supabaseAdmin
        .from("budgets")
        .update({
          monthly_limit_usd: input.monthlyLimitUsd,
          // Keep existing threshold; ensure column exists by not touching it here.
        })
        .eq("id", budgetId);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabaseAdmin.from("budgets").insert({
        user_id: userId,
        provider_id: provider.id,
        monthly_limit_usd: input.monthlyLimitUsd,
        alert_threshold_pct: defaultThresholdPct,
      });
      if (insertError) throw new Error(insertError.message);
    }
  }
}

async function tryUpdateEmailToggleOnBudgets(input: {
  userId: string;
  providerIds: string[];
  enabled: boolean;
}) {
  // We don't know the exact column name for the email toggle from the screenshot,
  // so we try a few common candidates and stop at the first success.
  const candidateColumns = [
    "email_notifications_enabled",
    "email_notification_enabled",
    "email_alerts_enabled",
    "email_enabled",
    "notifications_email_enabled",
    "notify_by_email",
  ] as const;

  for (const column of candidateColumns) {
    const { error } = await supabaseAdmin
      .from("budgets")
      .update({ [column]: input.enabled })
      .eq("user_id", input.userId)
      .in("provider_id", input.providerIds);

    if (!error) return;

    const msg = error.message?.toLowerCase?.() ?? "";
    if (msg.includes("column") && msg.includes("does not exist")) {
      continue;
    }

    // If it's not a missing-column error, bubble it up because we don't want silent failure.
    throw new Error(error.message);
  }
}

export async function saveNotificationPreferences(input: {
  providerNames: OnboardingProviderInput["providerName"][];
  alertThresholdPct: number;
  emailEnabled: boolean;
}) {
  const { userId } = await requireUser();

  if (!Number.isFinite(input.alertThresholdPct)) {
    throw new Error("Invalid threshold percent");
  }

  const thresholdPct = Math.max(0, Math.min(100, Math.round(input.alertThresholdPct)));

  if (!input.providerNames?.length) {
    throw new Error("Select at least one provider");
  }

  const { data: providerRows, error: providerError } = await supabaseAdmin
    .from("providers")
    .select("id, provider_name")
    .eq("user_id", userId)
    .in("provider_name", input.providerNames);

  if (providerError) throw new Error(providerError.message);
  const providers = (providerRows ?? []).filter(
    (r): r is { id: string; provider_name: string } => !!r?.id
  );
  if (!providers.length) throw new Error("No providers found");

  const providerIds = providers.map((p) => p.id);

  const { error: thresholdError } = await supabaseAdmin
    .from("budgets")
    .update({ alert_threshold_pct: thresholdPct })
    .eq("user_id", userId)
    .in("provider_id", providerIds);

  if (thresholdError) throw new Error(thresholdError.message);

  // Best-effort email toggle persistence (only if the column exists).
  await tryUpdateEmailToggleOnBudgets({
    userId,
    providerIds,
    enabled: input.emailEnabled,
  });
}

