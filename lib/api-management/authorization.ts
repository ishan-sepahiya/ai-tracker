import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type TeamContext = {
  userId: string;
  subscriptionId: string;
  organizationId: string;
  role: "owner" | "member";
};

async function getAuthenticatedUserId(): Promise<string> {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {
          // Server component: cookie writes are handled by
          // the existing authentication flow.
        },
      },
    },
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Unauthorized");
  }

  return user.id;
}

export async function getTeamContext(): Promise<TeamContext> {
  const userId = await getAuthenticatedUserId();

  const { data: subscription, error: subscriptionError } =
    await supabaseAdmin
      .from("subscriptions")
      .select("id, owner_user_id")
      .eq("owner_user_id", userId)
      .maybeSingle();

  if (subscriptionError) {
    throw new Error(
      `Failed to load subscription: ${subscriptionError.message}`,
    );
  }

  if (subscription) {
    const { data: organization, error: organizationError } =
      await supabaseAdmin
        .from("organizations")
        .select("id")
        .eq("subscription_id", subscription.id)
        .maybeSingle();

    if (organizationError) {
      throw new Error(
        `Failed to load organization: ${organizationError.message}`,
      );
    }

    if (!organization) {
      throw new Error(
        "No organization is associated with your subscription.",
      );
    }

    return {
      userId,
      subscriptionId: subscription.id,
      organizationId: organization.id,
      role: "owner",
    };
  }

  const { data: membership, error: membershipError } =
    await supabaseAdmin
      .from("team_members")
      .select("subscription_id, role")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Failed to load team membership: ${membershipError.message}`,
    );
  }

  if (!membership) {
    throw new Error(
      "You do not belong to a team with API Management access.",
    );
  }

  const { data: organization, error: organizationError } =
    await supabaseAdmin
      .from("organizations")
      .select("id")
      .eq("subscription_id", membership.subscription_id)
      .maybeSingle();

  if (organizationError) {
    throw new Error(
      `Failed to load organization: ${organizationError.message}`,
    );
  }

  if (!organization) {
    throw new Error(
      "Your team does not have an organization configured.",
    );
  }

  const role =
    membership.role === "owner" ? "owner" : "member";

  return {
    userId,
    subscriptionId: membership.subscription_id,
    organizationId: organization.id,
    role,
  };
}