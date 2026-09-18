import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { supabaseAdmin } from "@/lib/supabase-admin";

export type TeamContext = {
  userId: string;
  subscriptionId: string | null;

  // Kept as a single ID for compatibility with the
  // existing subscription/team authorization flow.
  //
  // API Management itself can now work with multiple
  // organizations through organization-specific access checks.
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
          // Server component / route handler cookie writes are
          // handled by the existing authentication flow.
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
 * Existing team context.
 *
 * This remains compatible with the existing subscription/team
 * authorization system.
 *
 * IMPORTANT:
 * This should NOT be used by API Management to decide which
 * organizations the user can see.
 *
 * API Management should use requireOrganizationAccess()
 * with the specific organization ID.
 */
export async function getTeamContext(): Promise<TeamContext> {
  const userId = await getAuthenticatedUserId();

  /*
   * ---------------------------------------------------------
   * 1. Development / user-owned organization
   * ---------------------------------------------------------
   *
   * During development an authenticated user can work with
   * organizations they own without requiring a subscription.
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

/**
 * Verify that the authenticated user has access to a
 * SPECIFIC organization.
 *
 * This is the authorization function that API Management
 * CRUD operations should use.
 *
 * Development:
 *   User owns organization -> allowed
 *
 * Production/team:
 *   Subscription owner -> allowed
 *   Active team member -> allowed
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
   * 1. User directly owns this organization
   * ---------------------------------------------------------
   *
   * This is what enables multiple organizations during
   * development without hardcoded user IDs.
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
   * 2. Check whether the organization belongs to a
   *    subscription owned by the current user.
   * ---------------------------------------------------------
   */
  const { data: subscription, error: subscriptionError } =
    await supabaseAdmin
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
    const { data: organization, error: organizationError } =
      await supabaseAdmin
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
   * 3. Check active team membership
   * ---------------------------------------------------------
   */
  const { data: membership, error: membershipError } =
    await supabaseAdmin
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
    const { data: organization, error: organizationError } =
      await supabaseAdmin
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

  /*
   * ---------------------------------------------------------
   * 4. No access
   * ---------------------------------------------------------
   */
  throw new Error(
    "Forbidden: You do not have access to this organization.",
  );
}