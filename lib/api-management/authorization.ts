import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type TeamContext = {
  userId: string;
  subscriptionId: string | null;

  // Kept for compatibility with the existing
  // subscription/team authorization flow.
  organizationId: string;

  role: "owner" | "member";
};

export type OrganizationAccess = {
  userId: string;
  organizationId: string;
  subscriptionId: string | null;
  role: "owner" | "member";
};

/**
 * Get the currently authenticated Supabase user ID.
 */
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
          // Server-side authentication flow handles cookie writes.
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

/**
 * Get the current user's API Management context.
 *
 * API Management supports multiple organizations owned by
 * the authenticated user.
 *
 * This function is retained for compatibility with existing
 * parts of the application that expect a single TeamContext.
 *
 * For organization-specific authorization, use
 * requireOrganizationAccess().
 */
export async function getTeamContext(): Promise<TeamContext> {
  const userId = await getAuthenticatedUserId();

  /*
   * ---------------------------------------------------------
   * 1. User-owned organization
   * ---------------------------------------------------------
   *
   * Development users can access their own organizations
   * without requiring a subscription.
   */
  const {
    data: ownedOrganization,
    error: ownedOrganizationError,
  } = await supabaseAdmin
    .from("organizations")
    .select("id, subscription_id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedOrganizationError) {
    throw new Error(
      `Failed to load user organization: ${ownedOrganizationError.message}`,
    );
  }

  if (ownedOrganization) {
    return {
      userId,
      subscriptionId: ownedOrganization.subscription_id,
      organizationId: ownedOrganization.id,
      role: "owner",
    };
  }

  /*
   * ---------------------------------------------------------
   * 2. Existing subscription owner flow
   * ---------------------------------------------------------
   */
  const {
    data: subscription,
    error: subscriptionError,
  } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(
      `Failed to load subscription: ${subscriptionError.message}`,
    );
  }

  if (subscription) {
    const {
      data: organization,
      error: organizationError,
    } = await supabaseAdmin
      .from("organizations")
      .select("id, subscription_id")
      .eq("subscription_id", subscription.id)
      .maybeSingle();

    if (organizationError) {
      throw new Error(
        `Failed to load organization: ${organizationError.message}`,
      );
    }

    if (organization) {
      return {
        userId,
        subscriptionId: subscription.id,
        organizationId: organization.id,
        role: "owner",
      };
    }
  }

  /*
   * ---------------------------------------------------------
   * 3. Existing team-member flow
   * ---------------------------------------------------------
   */
  const {
    data: membership,
    error: membershipError,
  } = await supabaseAdmin
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

  const {
    data: organization,
    error: organizationError,
  } = await supabaseAdmin
    .from("organizations")
    .select("id, subscription_id")
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

  return {
    userId,
    subscriptionId: membership.subscription_id,
    organizationId: organization.id,
    role:
      membership.role === "owner"
        ? "owner"
        : "member",
  };
}

/**
 * Verify access to a specific organization.
 *
 * Access is granted when:
 *
 * 1. The authenticated user owns the organization.
 * 2. The organization belongs to a subscription owned by
 *    the authenticated user.
 * 3. The authenticated user is an active team member of
 *    the organization's subscription.
 */
export async function requireOrganizationAccess(
  organizationId: string,
): Promise<OrganizationAccess> {
  if (!organizationId) {
    throw new Error("Organization ID is required.");
  }

  const userId = await getAuthenticatedUserId();

  /*
   * ---------------------------------------------------------
   * 1. Direct ownership
   * ---------------------------------------------------------
   */
  const {
    data: ownedOrganization,
    error: ownedOrganizationError,
  } = await supabaseAdmin
    .from("organizations")
    .select("id, subscription_id")
    .eq("id", organizationId)
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (ownedOrganizationError) {
    throw new Error(
      `Failed to verify organization ownership: ${ownedOrganizationError.message}`,
    );
  }

  if (ownedOrganization) {
    return {
      userId,
      organizationId: ownedOrganization.id,
      subscriptionId: ownedOrganization.subscription_id,
      role: "owner",
    };
  }

  /*
   * ---------------------------------------------------------
   * 2. Subscription owner
   * ---------------------------------------------------------
   */
  const {
    data: subscription,
    error: subscriptionError,
  } = await supabaseAdmin
    .from("subscriptions")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (subscriptionError) {
    throw new Error(
      `Failed to verify subscription ownership: ${subscriptionError.message}`,
    );
  }

  if (subscription) {
    const {
      data: organization,
      error: organizationError,
    } = await supabaseAdmin
      .from("organizations")
      .select("id, subscription_id")
      .eq("id", organizationId)
      .eq("subscription_id", subscription.id)
      .maybeSingle();

    if (organizationError) {
      throw new Error(
        `Failed to verify organization: ${organizationError.message}`,
      );
    }

    if (organization) {
      return {
        userId,
        organizationId: organization.id,
        subscriptionId: organization.subscription_id,
        role: "owner",
      };
    }
  }

  /*
   * ---------------------------------------------------------
   * 3. Active team member
   * ---------------------------------------------------------
   */
  const {
    data: membership,
    error: membershipError,
  } = await supabaseAdmin
    .from("team_members")
    .select("subscription_id, role")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (membershipError) {
    throw new Error(
      `Failed to verify team membership: ${membershipError.message}`,
    );
  }

  if (membership) {
    const {
      data: organization,
      error: organizationError,
    } = await supabaseAdmin
      .from("organizations")
      .select("id, subscription_id")
      .eq("id", organizationId)
      .eq("subscription_id", membership.subscription_id)
      .maybeSingle();

    if (organizationError) {
      throw new Error(
        `Failed to verify team organization: ${organizationError.message}`,
      );
    }

    if (organization) {
      return {
        userId,
        organizationId: organization.id,
        subscriptionId: organization.subscription_id,
        role:
          membership.role === "owner"
            ? "owner"
            : "member",
      };
    }
  }

  throw new Error(
    "Forbidden: You do not have access to this organization.",
  );
}