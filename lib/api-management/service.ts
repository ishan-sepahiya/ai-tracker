import { getTeamContext } from "@/lib/api-management/authorization";

import {
  listApiKeys,
  listDepartments,
  listEnvironments,
  listOrganizations,
  listProjects,
  listProviderCredentials,
} from "@/lib/api-management/repository";

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

export async function getOrganizationTree(): Promise<OrganizationTree[]> {
  // Get the currently authenticated user
  const context = await getTeamContext();

  // IMPORTANT:
  // Load ALL organizations owned by this user,
  // instead of loading only context.organizationId.
  const organizations = await listOrganizations(context.userId);

  const organizationTree: OrganizationTree[] = [];

  for (const organization of organizations) {
    // Get all departments belonging to this organization
    const departments = await listDepartments(organization.id);

    const departmentTree: DepartmentWithResources[] = [];

    for (const department of departments) {
      // Get all projects belonging to this department
      const projects = await listProjects(department.id);

      const projectTree: ProjectWithResources[] = [];

      for (const project of projects) {
        // Get all environments belonging to this project
        const environments = await listEnvironments(project.id);

        const environmentTree: EnvironmentWithResources[] = [];

        for (const environment of environments) {
          // Get API keys and provider credentials
          // belonging to this environment
          const apiKeys = await listApiKeys(environment.id);

          const providerCredentials =
            await listProviderCredentials(environment.id);

          environmentTree.push({
            ...environment,
            apiKeys,
            providerCredentials,
          });
        }

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

    organizationTree.push({
      ...organization,
      departments: departmentTree,
    });
  }

  return organizationTree;
}