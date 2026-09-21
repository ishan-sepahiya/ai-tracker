import { requireUser } from "@/lib/auth/server";
import { getOrganizationTree } from "@/lib/api-management/service";
import { canCreateOrganization } from "@/lib/api-management/rules";

import OrganizationTree from "./components/OrganizationTree";
import ApiManagementActions from "./components/ApiManagementActions";
import MetricsOverview from "./components/MetricsOverview";

export default async function ApiManagementPage() {
  await requireUser();

  const organizations = await getOrganizationTree();

  // Rule: one organization per user. Only offer "create" when none exists.
  const showCreateButton = canCreateOrganization(organizations.length);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-8 p-6 md:p-8">
      {/* Page header */}
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="inline-flex items-center rounded-full bg-dusk-blue/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-dusk-blue">
            Team Infrastructure
          </span>

          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink-black">
            API Management
          </h1>

          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-gray-500">
            Manage organizations, departments, projects, environments, API
            keys, and AI provider credentials.
          </p>
        </div>

        {showCreateButton && <ApiManagementActions organizations={[]} />}
      </header>

      {/* KPI metrics + date range */}
      <MetricsOverview organizations={organizations} />

      {/* Organizations */}
      <OrganizationTree organizations={organizations} />
    </main>
  );
}