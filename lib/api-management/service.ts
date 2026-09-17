import { getTeamContext } from "@/lib/api-management/authorization";

import {
  listApiKeys,
  listDepartments,
  listEnvironments,
  listProjects,
  listProviderCredentials,
} from "@/lib/api-management/repository";

import { supabaseAdmin } from "@/lib/supabase-admin";

import type {
  ApiKey,
  Department,
  Environment,
  Organization,
  Project,
  ProviderCredential,
} from "@/lib/api-management/types";

export type EnvironmentWithResources = Environment & {
  apiKeys: ApiKey[];
  providerCredentials: ProviderCredential[];
};

export type ProjectWithResources = Project & {
  environments: EnvironmentWithResources[];
};

export type DepartmentWithResources = Department & {
  projects: ProjectWithResources[];
};

export type OrganizationTree = Organization & {
  departments: DepartmentWithResources[];
};

export async function getOrganizationTree(): Promise<
  OrganizationTree[]
> {
  const context = await getTeamContext();

  const { data: organization, error } = await supabaseAdmin
    .from("organizations")
    .select("*")
    .eq("id", context.organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to load organization: ${error.message}`,
    );
  }

  if (!organization) {
    return [];
  }

  const departments = await listDepartments(
    organization.id,
  );

  const departmentTree: DepartmentWithResources[] = [];

  for (const department of departments) {
    const projects = await listProjects(department.id);

    const projectTree: ProjectWithResources[] = [];

    for (const project of projects) {
      const environments = await listEnvironments(
        project.id,
      );

      const apiKeys = await listApiKeys(project.id);

      const providerCredentials =
        await listProviderCredentials(project.id);

      const environmentTree: EnvironmentWithResources[] =
        environments.map((environment) => ({
          ...environment,

          apiKeys: apiKeys.filter(
            (key) =>
              key.environment_id === environment.id,
          ),

          providerCredentials:
            providerCredentials.filter(
              (credential) =>
                credential.environment_id ===
                environment.id,
            ),
        }));

      projectTree.push({
        ...project,
        environments: environmentTree,
      });
    }

    departmentTree.push({
      ...department,
      projects: projectTree,
    });
  }

  return [
    {
      ...organization,
      departments: departmentTree,
    },
  ];
}