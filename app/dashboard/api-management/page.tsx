import { requireUser } from "@/lib/auth/server";
import { getOrganizationTree } from "@/lib/api-management/service";

import OrganizationTree from "./components/OrganizationTree";

export default async function ApiManagementPage() {
  await requireUser();

  const organizations = await getOrganizationTree();

  return (
    <main className="space-y-8 p-6 md:p-8">
      {/* Page Header */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-dusk-blue">
            Team Infrastructure
          </p>

          <h1 className="mt-1 text-3xl font-semibold text-ink-black">
            API Management
          </h1>

          <p className="mt-2 max-w-3xl text-sm text-gray-500">
            Manage organizations, departments, projects,
            environments, API keys, and AI provider credentials.
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-prussian-blue px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
        >
          <span className="text-base">+</span>
          Organization
        </button>
      </div>

      {/* Organization Hierarchy */}
      <OrganizationTree organizations={organizations} />
    </main>
  );
}