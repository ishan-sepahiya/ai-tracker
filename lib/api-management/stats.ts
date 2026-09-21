import type { OrganizationTree } from "@/lib/api-management/service";

export type OrgCounts = {
  departments: number;
  projects: number;
  environments: number;
};

export function getOrgCounts(org: OrganizationTree): OrgCounts {
  let projects = 0;
  let environments = 0;

  for (const department of org.departments) {
    projects += department.projects.length;
    for (const project of department.projects) {
      environments += project.environments.length;
    }
  }

  return {
    departments: org.departments.length,
    projects,
    environments,
  };
}

export type Totals = {
  organizations: number;
  departments: number;
  projects: number;
  environments: number;
};

export function getTotals(orgs: OrganizationTree[]): Totals {
  const totals: Totals = {
    organizations: orgs.length,
    departments: 0,
    projects: 0,
    environments: 0,
  };

  for (const org of orgs) {
    const c = getOrgCounts(org);
    totals.departments += c.departments;
    totals.projects += c.projects;
    totals.environments += c.environments;
  }

  return totals;
}

/** Counts of resources created on/after `since` (null = all time). */
export function getNewSince(
  orgs: OrganizationTree[],
  since: Date | null,
): Totals {
  const isNew = (value: string | null) => {
    if (!since) return true;
    if (!value) return false;
    return new Date(value).getTime() >= since.getTime();
  };

  const result: Totals = {
    organizations: 0,
    departments: 0,
    projects: 0,
    environments: 0,
  };

  for (const org of orgs) {
    if (isNew(org.created_at)) result.organizations++;
    for (const dept of org.departments) {
      if (isNew(dept.created_at)) result.departments++;
      for (const project of dept.projects) {
        if (isNew(project.created_at)) result.projects++;
        for (const env of project.environments) {
          if (isNew(env.created_at)) result.environments++;
        }
      }
    }
  }

  return result;
}

export function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}