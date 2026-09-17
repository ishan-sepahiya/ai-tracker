import type { OrganizationTree as OrganizationTreeType } from "@/lib/api-management/service";

import DepartmentSection from "./DepartmentSection";

type OrganizationTreeProps = {
  organizations: OrganizationTreeType[];
};

export default function OrganizationTree({
  organizations,
}: OrganizationTreeProps) {
  if (organizations.length === 0) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm">
        <div className="mx-auto max-w-md text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
            🏢
          </div>

          <h2 className="mt-5 text-lg font-semibold text-ink-black">
            No organizations found
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Organizations, departments, projects, and environments
            will appear here once they are configured.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {organizations.map((organization) => (
        <section
          key={organization.id}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
        >
          {/* Organization Header */}
          <div className="border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-prussian-blue text-xl text-white shadow-sm">
                  🏢
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold text-ink-black">
                      {organization.name}
                    </h2>

                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">
                      Organization
                    </span>
                  </div>

                  <p className="mt-1 text-sm text-gray-500">
                    {organization.departments.length}{" "}
                    {organization.departments.length === 1
                      ? "department"
                      : "departments"}
                  </p>
                </div>
              </div>

              <div className="hidden text-right sm:block">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  Organization ID
                </p>

                <p className="mt-1 font-mono text-xs text-gray-500">
                  {organization.id.slice(0, 8)}…
                </p>
              </div>
            </div>
          </div>

          {/* Departments */}
          <div className="space-y-4 p-5 md:p-6">
            {organization.departments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center">
                <p className="text-sm text-gray-500">
                  No departments configured for this organization.
                </p>
              </div>
            ) : (
              organization.departments.map((department) => (
                <DepartmentSection
                  key={department.id}
                  department={department}
                />
              ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}