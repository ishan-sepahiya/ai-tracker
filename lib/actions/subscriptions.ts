"use server";

import { supabaseAdmin } from "@/lib/supabase-admin";

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export async function ensureTrialSubscriptionAndOwnerTeamMember(
  userId: string
) {
  try {
    console.log("[ensureTrialSubscriptionAndOwnerTeamMember] Starting for user:", userId);
    
    // Get trial plan
    console.log("[ensureTrialSubscriptionAndOwnerTeamMember] Fetching trial plan...");
    const { data: trialPlan, error: planError } = await supabaseAdmin
      .from("subscription_plans")
      .select("id")
      .eq("name", "trial")
      .maybeSingle();

    if (planError) {
      console.error("[ensureTrialSubscriptionAndOwnerTeamMember] Plan fetch error:", planError);
      throw new Error(`Failed to fetch trial plan: ${planError.message}`);
    }
    if (!trialPlan?.id) {
      console.error("[ensureTrialSubscriptionAndOwnerTeamMember] Trial plan not found in database");
      throw new Error("Trial plan not found in database. Please ensure subscription_plans table has a 'trial' plan.");
    }
    console.log("[ensureTrialSubscriptionAndOwnerTeamMember] Trial plan found:", trialPlan.id);

    // Check existing subscription
    console.log("[ensureTrialSubscriptionAndOwnerTeamMember] Checking for existing subscription...");
    const { data: existingSub, error: subError } = await supabaseAdmin
      .from("subscriptions")
      .select("id")
      .eq("owner_user_id", userId)
      .maybeSingle();

    if (subError) {
      console.error("[ensureTrialSubscriptionAndOwnerTeamMember] Subscription fetch error:", subError);
      throw new Error(`Failed to fetch subscription: ${subError.message}`);
    }

    let subscriptionId: string;
    if (existingSub?.id) {
      console.log("[ensureTrialSubscriptionAndOwnerTeamMember] Using existing subscription:", existingSub.id);
      subscriptionId = existingSub.id;
    } else {
      // Create new subscription
      console.log("[ensureTrialSubscriptionAndOwnerTeamMember] Creating new subscription...");
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

      if (insertError) {
        console.error("[ensureTrialSubscriptionAndOwnerTeamMember] Subscription creation error:", insertError);
        throw new Error(`Failed to create subscription: ${insertError.message}`);
      }
      subscriptionId = insertedSub.id;
      console.log("[ensureTrialSubscriptionAndOwnerTeamMember] New subscription created:", subscriptionId);
    }

    // Check existing owner team member
    console.log("[ensureTrialSubscriptionAndOwnerTeamMember] Checking for existing owner team member...");
    const { data: existingOwner, error: ownerError } = await supabaseAdmin
      .from("team_members")
      .select("id")
      .eq("subscription_id", subscriptionId)
      .eq("role", "owner")
      .maybeSingle();

    if (ownerError) {
      console.error("[ensureTrialSubscriptionAndOwnerTeamMember] Team member fetch error:", ownerError);
      throw new Error(`Failed to fetch team member: ${ownerError.message}`);
    }
    
    if (existingOwner?.id) {
      console.log("[ensureTrialSubscriptionAndOwnerTeamMember] Owner team member already exists");
      return;
    }

    // Create owner team member
    console.log("[ensureTrialSubscriptionAndOwnerTeamMember] Creating owner team member...");
    const { error: ownerInsertError } = await supabaseAdmin
      .from("team_members")
      .insert({
        subscription_id: subscriptionId,
        user_id: userId,
        role: "owner",
        invited_email: null,
        status: "active",
      });

    if (ownerInsertError) {
      console.error("[ensureTrialSubscriptionAndOwnerTeamMember] Team member creation error:", ownerInsertError);
      throw new Error(`Failed to create team member: ${ownerInsertError.message}`);
    }
    console.log("[ensureTrialSubscriptionAndOwnerTeamMember] Owner team member created successfully");
  } catch (error) {
    console.error("[ensureTrialSubscriptionAndOwnerTeamMember] Caught error:", error);
    throw error;
  }
}

