import { supabaseAdmin } from "@/lib/supabase-admin";

import type {
  ApiKey,
  Department,
  Environment,
  Organization,
  Project,
  ProviderCredential,
} from "@/lib/api-management/types";

/**
 * Get all organizations owned by a specific user.
 */
export async function listOrganizations(
  ownerUserId: string,
): Promise<Organization[]> {
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ listOrganizations failed:", error);

    throw new Error(
      `Failed to load organizations: ${error.message}`,
    );
  }

  return (data ?? []) as Organization[];
}

/**
 * Get departments belonging to an organization.
 */
export async function listDepartments(
  organizationId: string,
): Promise<Department[]> {
  const { data, error } = await supabaseAdmin
    .from("departments")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) {
    console.error(
      "❌ listDepartments failed:",
      {
        organizationId,
        error,
      },
    );

    throw new Error(
      `Failed to load departments: ${error.message}`,
    );
  }

  return (data ?? []) as Department[];
}

/**
 * Get projects belonging to a department.
 */
export async function listProjects(
  departmentId: string,
): Promise<Project[]> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select("*")
    .eq("department_id", departmentId)
    .order("name", { ascending: true });

  if (error) {
    console.error(
      "❌ listProjects failed:",
      {
        departmentId,
        error,
      },
    );

    throw new Error(
      `Failed to load projects: ${error.message}`,
    );
  }

  return (data ?? []) as Project[];
}

/**
 * Get environments belonging to a project.
 */
export async function listEnvironments(
  projectId: string,
): Promise<Environment[]> {
  const { data, error } = await supabaseAdmin
    .from("environments")
    .select("*")
    .eq("project_id", projectId)
    .order("name", { ascending: true });

  if (error) {
    console.error(
      "❌ listEnvironments failed:",
      {
        projectId,
        error,
      },
    );

    throw new Error(
      `Failed to load environments: ${error.message}`,
    );
  }

  return (data ?? []) as Environment[];
}

/**
 * Get SDK API keys belonging to an environment.
 *
 * Important:
 * The actual API key is never stored here.
 * The database only contains key_hash.
 *
 * We intentionally do NOT expose the raw key.
 */
export async function listApiKeys(
  environmentId: string,
): Promise<ApiKey[]> {
  const { data, error } = await supabaseAdmin
    .from("api_keys")
    .select(
      `
        id,
        user_id,
        project_id,
        environment_id,
        name,
        key_hash,
        last_used,
        expires_at,
        created_at,
        revoked,
        daily_budget
      `,
    )
    .eq("environment_id", environmentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "❌ listApiKeys failed:",
      {
        environmentId,
        error,
      },
    );

    throw new Error(
      `Failed to load API keys: ${error.message}`,
    );
  }

  return (data ?? []) as ApiKey[];
}

/**
 * Get provider credentials belonging to an environment.
 *
 * IMPORTANT:
 * secret_ref must never be rendered or returned to the
 * browser/frontend.
 *
 * The service layer will sanitize this data before it
 * reaches client components.
 */
export async function listProviderCredentials(
  environmentId: string,
): Promise<ProviderCredential[]> {
  const { data, error } = await supabaseAdmin
    .from("provider_credentials")
    .select(
      `
        id,
        project_id,
        environment_id,
        provider_name,
        display_name,
        secret_ref,
        status,
        created_by,
        rotated_at,
        created_at,
        updated_at
      `,
    )
    .eq("environment_id", environmentId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "❌ listProviderCredentials failed:",
      {
        environmentId,
        error,
      },
    );

    throw new Error(
      `Failed to load provider credentials: ${error.message}`,
    );
  }

  return (data ?? []) as ProviderCredential[];
}