import { supabaseAdmin } from "@/lib/supabase-admin";

import type {
  ApiKey,
  Department,
  Environment,
  Organization,
  Project,
  ProviderCredential,
} from "@/lib/api-management/types";

export async function listOrganizations(
  ownerUserId: string,
): Promise<Organization[]> {
  const { data, error } = await supabaseAdmin
    .from("organizations")
    .select(
      `
        id,
        name,
        owner_user_id,
        subscription_id,
        created_at,
        updated_at
      `,
    )
    .eq("owner_user_id", ownerUserId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listDepartments(
  organizationId: string,
): Promise<Department[]> {
  const { data, error } = await supabaseAdmin
    .from("departments")
    .select(
      `
        id,
        organization_id,
        name,
        created_at,
        updated_at
      `,
    )
    .eq("organization_id", organizationId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listProjects(
  departmentId: string,
): Promise<Project[]> {
  const { data, error } = await supabaseAdmin
    .from("projects")
    .select(
      `
        id,
        department_id,
        name,
        created_at,
        updated_at
      `,
    )
    .eq("department_id", departmentId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listEnvironments(
  projectId: string,
): Promise<Environment[]> {
  const { data, error } = await supabaseAdmin
    .from("environments")
    .select(
      `
        id,
        project_id,
        name,
        created_at
      `,
    )
    .eq("project_id", projectId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

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
    .order("created_at", {
      ascending: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listProviderCredentials(
  projectId: string,
  environmentId?: string,
): Promise<ProviderCredential[]> {
  let query = supabaseAdmin
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
    .eq("project_id", projectId);

  if (environmentId) {
    query = query.eq(
      "environment_id",
      environmentId,
    );
  } else {
    query = query.is(
      "environment_id",
      null,
    );
  }

  const { data, error } = await query.order(
    "created_at",
    {
      ascending: false,
    },
  );

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}