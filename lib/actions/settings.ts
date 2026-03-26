"use server";

import { randomUUID } from "crypto";

import { supabaseAdmin } from "@/lib/supabase-admin";
import { requireUser } from "@/lib/auth/server";
import { computeForecast } from "@/lib/analysis/engine";
import { sendAmberAlert, sendGreenAlert, sendRedAlert } from "@/lib/email";

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

const emailToggleCandidateColumns = [
  "email_notifications_enabled",
  "email_notification_enabled",
  "email_alerts_enabled",
  "email_enabled",
  "notifications_email_enabled",
  "notify_by_email",
] as const;

function extractEmailToggleFromBudgetRow(row: Record<string, unknown>): boolean | null {
  for (const col of emailToggleCandidateColumns) {
    const v = row[col];
    if (typeof v === "boolean") return v;
  }
  return null;
}

export async function getApiTokenLast8() {
  const { userId } = await requireUser();
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("api_token")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const token = (data as { api_token?: string } | null)?.api_token ?? "";
  const last8 = token.length ? token.slice(-8) : "";
  return { last8 };
}

export async function setApiToken(newToken: string) {
  const { userId } = await requireUser();
  const token = newToken.trim();
  if (!token) throw new Error("Invalid token");

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ api_token: token })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function updateFullName(fullName: string) {
  const { userId } = await requireUser();
  const name = fullName.trim();
  const value = name.length ? name : null;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ full_name: value })
    .eq("id", userId);

  if (error) throw new Error(error.message);
}

export async function deleteAccountSoft() {
  const { userId } = await requireUser();

  // Cancel subscriptions and deactivate providers. This is a "soft delete":
  // we do not remove the auth user, but we anonymize usage + revoke SDK access.
  const newToken = randomUUID();
  const { error: subErr } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("owner_user_id", userId);
  if (subErr) throw new Error(subErr.message);

  const { error: provErr } = await supabaseAdmin
    .from("providers")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (provErr) throw new Error(provErr.message);

  const { error: profileErr } = await supabaseAdmin
    .from("profiles")
    .update({
      full_name: null,
      api_token: newToken,
    })
    .eq("id", userId);
  if (profileErr) throw new Error(profileErr.message);
}

export async function getNotificationPrefs() {
  const { userId } = await requireUser();

  const { data, error } = await supabaseAdmin
    .from("budgets")
    .select("*")
    .eq("user_id", userId);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  const alertThresholdPct = (() => {
    const values = rows
      .map((r) => (typeof r.alert_threshold_pct === "string" ? Number(r.alert_threshold_pct) : r.alert_threshold_pct))
      .filter((v) => typeof v === "number" && Number.isFinite(v)) as number[];
    if (!values.length) return 80;
    // Use min so user is never less-protected than intended.
    return Math.min(...values);
  })();

  let emailEnabled: boolean | null = null;
  for (const row of rows) {
    emailEnabled = extractEmailToggleFromBudgetRow(row);
    if (emailEnabled !== null) break;
  }

  return {
    emailEnabled: emailEnabled ?? false,
    alertThresholdPct: clamp(alertThresholdPct, 0, 100),
  };
}

export async function setNotificationPrefs(input: {
  emailEnabled: boolean;
  alertThresholdPct: number;
}) {
  const { userId } = await requireUser();

  const alertThresholdPct = clamp(Math.round(input.alertThresholdPct), 0, 100);

  // Always update threshold.
  const { error: thresholdErr } = await supabaseAdmin
    .from("budgets")
    .update({ alert_threshold_pct: alertThresholdPct })
    .eq("user_id", userId);
  if (thresholdErr) throw new Error(thresholdErr.message);

  // Email toggle: try candidate columns.
  for (const column of emailToggleCandidateColumns) {
    const { error } = await supabaseAdmin
      .from("budgets")
      .update({ [column]: input.emailEnabled })
      .eq("user_id", userId);

    if (!error) return;

    const msg = error.message?.toLowerCase?.() ?? "";
    if (msg.includes("column") && msg.includes("does not exist")) {
      continue;
    }

    // If it's not a missing-column error, fail loudly.
    throw new Error(error.message);
  }
}

export async function sendTestAlertEmail() {
  const { userId } = await requireUser();

  const [{ data: profile }, { data: budgets }] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("email,full_name")
      .eq("id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("budgets")
      .select("alert_threshold_pct")
      .eq("user_id", userId),
  ]);

  const email = profile?.email ?? null;
  if (!email) throw new Error("Missing profile email");

  const rows = (budgets ?? []) as Array<{ alert_threshold_pct: number | null }>;
  const alertThresholdPct = (() => {
    const values = rows
      .map((r) => (typeof r.alert_threshold_pct === "string" ? Number(r.alert_threshold_pct) : r.alert_threshold_pct))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    return values.length ? Math.min(...values) : 80;
  })();

  const forecast = await computeForecast(userId);
  const pct = forecast.pct_of_budget;
  const limit = forecast.monthly_limit_usd;
  const spend = forecast.projected_total_usd;

  const user = { email, full_name: profile?.full_name ?? null };

  // Choose alert level based on current forecast vs threshold.
  if (pct >= 100) {
    await sendRedAlert(user, spend, limit);
    return { sent: true, level: "red" as const };
  }

  if (pct >= alertThresholdPct) {
    await sendAmberAlert(user, spend, limit, pct);
    return { sent: true, level: "amber" as const };
  }

  await sendGreenAlert(user, spend, limit);
  return { sent: true, level: "green" as const };
}

export async function updateEmailPreferences(input: {
  emailEnabled: boolean;
  alertThresholdPct: number;
}) {
  return setNotificationPrefs(input);
}

