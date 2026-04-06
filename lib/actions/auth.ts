"use server";

import { ensureProfileRow } from "@/lib/auth/server";
import { ensureTrialSubscriptionAndOwnerTeamMember } from "@/lib/actions/subscriptions";

export async function createProfile(userId: string, email: string | null) {
  try {
    console.log("[createProfile] Starting for user:", userId);
    
    // Keep this as a separate action so onboarding/signup can call it.
    console.log("[createProfile] Creating profile row...");
    await ensureProfileRow(userId, email);
    console.log("[createProfile] Profile row created successfully");
    
    console.log("[createProfile] Creating trial subscription...");
    await ensureTrialSubscriptionAndOwnerTeamMember(userId);
    console.log("[createProfile] Trial subscription created successfully");
  } catch (error) {
    console.error("[createProfile] Error:", error);
    throw error;
  }
}

