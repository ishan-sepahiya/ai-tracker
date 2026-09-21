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
  SafeProviderCredential,
} from "@/lib/api-management/types";

export type EnvironmentWithResources =
  Environment & {
    apiKeys: ApiKey[];
    providerCredentials: SafeProviderCredential[];
  };

export type ProjectWithResources =
  Project & {
    environments: EnvironmentWithResources[];
    providerCredentials: SafeProviderCredential[];
  };

export type DepartmentWithResources =
  Department & {
    projects: ProjectWithResources[];
  };

export type OrganizationTree =
  Organization & {
    departments: DepartmentWithResources[];
  };

function sanitizeProviderCredential(
  credential: ProviderCredential,
): SafeProviderCredential {
  const {
    secret_ref: _secretRef,
    ...safeCredential
  } = credential;

  return safeCredential;
}

export async function getOrganizationTree(): Promise<
  OrganizationTree[]
> {
  const context = await getTeamContext();

  const organizations =
    await listOrganizations(context.userId);

  const organizationTree: OrganizationTree[] = [];

  for (const organization of organizations) {
    const departments =
      await listDepartments(organization.id);

    const departmentTree: DepartmentWithResources[] =
      [];

    for (const department of departments) {
      const projects =
        await listProjects(department.id);

      const projectTree: ProjectWithResources[] = [];

      for (const project of projects) {
        const environments =
          await listEnvironments(project.id);

        const projectCredentials =
          await listProviderCredentials(
            project.id,
          );

        const safeProjectCredentials =
          projectCredentials
            .filter(
              (credential) =>
                credential.environment_id === null,
            )
            .map(sanitizeProviderCredential);

        const environmentTree: EnvironmentWithResources[] =
          [];

        for (const environment of environments) {
          const apiKeys =
            await listApiKeys(environment.id);

          const providerCredentials =
            await listProviderCredentials(
              project.id,
              environment.id,
            );

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
          providerCredentials:
            safeProjectCredentials,
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