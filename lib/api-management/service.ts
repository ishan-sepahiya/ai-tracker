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
  providerCredentials: Omit<ProviderCredential, "secret_ref">[];
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

/**
 * Remove sensitive provider credential data before
 * sending the organization tree to React components.
 *
 * secret_ref contains the reference to the provider secret
 * and must never reach the frontend.
 */
function sanitizeProviderCredential(
  credential: ProviderCredential,
): Omit<ProviderCredential, "secret_ref"> {
  const {
    secret_ref: _secretRef,
    ...safeCredential
  } = credential;

  return safeCredential;
}

/**
 * Build the complete Organization → Department → Project
 * → Environment → Resources hierarchy for the current user.
 */
export async function getOrganizationTree(): Promise<
  OrganizationTree[]
> {
  /*
   * getTeamContext() authenticates the current user and
   * provides the user ID.
   *
   * We use the user ID to load ALL organizations owned by
   * that authenticated user.
   */
  const context = await getTeamContext();

  const organizations = await listOrganizations(
    context.userId,
  );

  const organizationTree: OrganizationTree[] = [];

  for (const organization of organizations) {
    const departments = await listDepartments(
      organization.id,
    );

    const departmentTree: DepartmentWithResources[] = [];

    for (const department of departments) {
      const projects = await listProjects(
        department.id,
      );

      const projectTree: ProjectWithResources[] = [];

      for (const project of projects) {
        const environments = await listEnvironments(
          project.id,
        );

        const environmentTree: EnvironmentWithResources[] =
          [];

        for (const environment of environments) {
          /*
           * API keys and provider credentials are scoped to
           * the environment.
           */
          const apiKeys = await listApiKeys(
            environment.id,
          );

          const providerCredentials =
            await listProviderCredentials(
              environment.id,
            );

          /*
           * Never expose secret_ref to the frontend.
           */
          const safeProviderCredentials =
            providerCredentials.map(
              sanitizeProviderCredential,
            );

          environmentTree.push({
            ...environment,
            apiKeys,
            providerCredentials:
              safeProviderCredentials,
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