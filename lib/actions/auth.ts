"use server";

import { ensureProfileRow } from "@/lib/auth/server";
import { ensureTrialSubscriptionAndOwnerTeamMember } from "@/lib/actions/subscriptions";

export async function createProfile(userId: string, email: string | null) {
  // Keep this as a separate action so onboarding/signup can call it.
  await ensureProfileRow(userId, email);
  await ensureTrialSubscriptionAndOwnerTeamMember(userId);
}

