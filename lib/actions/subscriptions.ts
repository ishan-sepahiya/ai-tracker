"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function ensureTrialSubscriptionAndOwnerTeamMember(
  userId: string
) {
  const { data: trialPlan, error: planError } = await supabaseAdmin
    .from("subscription_plans")
    .select("id")
    .eq("name", "trial")
    .maybeSingle();

  if (planError) throw new Error(planError.message);
  if (!trialPlan?.id) throw new Error("Trial plan not found");

  const { data: existingSub, error: subError } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (subError) throw new Error(subError.message);

  let subscriptionId: string;
  if (existingSub?.id) {
    subscriptionId = existingSub.id;
  } else {
    const now = new Date();
    const trialEnds = addDays(now, 30);

    const { data: insertedSub, error: insertError } = await supabaseAdmin
      .from("subscriptions")
      .insert({
        owner_user_id: userId,
        plan_id: trialPlan.id,
        status: "trialing",
        trial_ends_at: trialEnds.toISOString(),
        current_period_end: trialEnds.toISOString(),
      })
      .select("id")
      .single();

    if (insertError) throw new Error(insertError.message);
    subscriptionId = insertedSub.id;
  }

  const { data: existingOwner, error: ownerError } = await supabaseAdmin
    .from("team_members")
    .select("id")
    .eq("subscription_id", subscriptionId)
    .eq("role", "owner")
    .maybeSingle();

  if (ownerError) throw new Error(ownerError.message);
  if (existingOwner?.id) return;

  const { error: ownerInsertError } = await supabaseAdmin
    .from("team_members")
    .insert({
      subscription_id: subscriptionId,
      user_id: userId,
      role: "owner",
      invited_email: null,
      status: "active",
    });

  if (ownerInsertError) throw new Error(ownerInsertError.message);
}

