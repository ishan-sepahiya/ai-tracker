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
 * Get all organizations.
 */
export async function listOrganizations(
  ownerUserId?: string,
): Promise<Organization[]> {
  let query = supabaseAdmin
    .from("organizations")
    .select("*")
    .order("name", { ascending: true });

  if (ownerUserId) {
    query = query.eq("owner_user_id", ownerUserId);
  }

  const { data, error } = await query;

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

  console.log(
    `✅ departments loaded for organization ${organizationId}:`,
    data?.length ?? 0,
  );

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

  console.log(
    `✅ projects loaded for department ${departmentId}:`,
    data?.length ?? 0,
  );

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

  console.log(
    `✅ environments loaded for project ${projectId}:`,
    data?.length ?? 0,
  );

  return (data ?? []) as Environment[];
}

/**
 * Get SDK API keys belonging to a project.
 *
 * Important:
 * We intentionally do NOT expose the actual API key.
 * The database stores only key_hash.
 */
export async function listApiKeys(
  projectId: string,
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
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "❌ listApiKeys failed:",
      {
        projectId,
        error,
      },
    );

    throw new Error(
      `Failed to load API keys: ${error.message}`,
    );
  }
  return (data ?? []) as ApiKey[];

  console.log(
    `✅ API keys loaded for project ${projectId}:`,
    data?.length ?? 0,
  );

  return (data ?? []) as ApiKey[];
}

/**
 * Get provider credentials belonging to a project.
 *
 * secret_ref is returned here because it is currently part
 * of the database schema, but it MUST NOT be rendered
 * directly in the frontend.
 */
export async function listProviderCredentials(
  projectId: string,
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
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(
      "❌ listProviderCredentials failed:",
      {
        projectId,
        error,
      },
    );

    throw new Error(
      `Failed to load provider credentials: ${error.message}`,
    );
  }

  console.log(
    `✅ provider credentials loaded for project ${projectId}:`,
    data?.length ?? 0,
  );

  return (data ?? []) as ProviderCredential[];
}