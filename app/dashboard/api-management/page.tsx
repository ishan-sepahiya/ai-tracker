import { requireUser } from "@/lib/auth/server";
import { getOrganizationTree } from "@/lib/api-management/service";

import ApiManagementActions from "./components/ApiManagementActions";
import InfrastructureWorkspace from "./components/workspace/InfrastructureWorkspace";

export default async function ApiManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ node?: string | string[] }>;
}) {
  await requireUser();

  const organizations = await getOrganizationTree();
  const { node } = await searchParams;
  const initialNode = typeof node === "string" ? node : null;

  /* ---------- No organization yet: offer to create the one allowed ---------- */
  if (organizations.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl">
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-12 text-center">
          <span className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-blue-700">
            Team Infrastructure
          </span>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Create your organization
          </h1>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            Each account has one organization. Once it exists you can add
            departments, projects, environments, API keys, and AI provider
            credentials.
          </p>

          <div className="mt-6 flex justify-center">
            <ApiManagementActions />
          </div>
        </div>
      </main>
    );
  }

  // The dashboard layout wraps pages in `px-6 lg:px-8`, while the
  // navbar uses `px-6`. `lg:-mx-2` lines the content up with the navbar edges.
  return (
    <main className="lg:-mx-2">
      <InfrastructureWorkspace
        organizations={organizations}
        initialNode={initialNode}
      />
    </main>
  );
}
