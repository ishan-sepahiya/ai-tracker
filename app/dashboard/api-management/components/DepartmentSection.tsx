import type { DepartmentWithResources } from "@/lib/api-management/service";

import ProjectSection from "./ProjectSection";

type DepartmentSectionProps = {
  department: DepartmentWithResources;
};

export default function DepartmentSection({
  department,
}: DepartmentSectionProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      {/* Department Header */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-lg">
            🏛️
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-ink-black">
                {department.name}
              </h3>

              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-500">
                Department
              </span>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {department.projects.length}{" "}
              {department.projects.length === 1
                ? "project"
                : "projects"}
            </p>
          </div>
        </div>

        <div className="hidden font-mono text-xs text-gray-400 md:block">
          {department.id.slice(0, 8)}…
        </div>
      </div>

      {/* Projects */}
      <div className="space-y-3 bg-gray-50/50 p-4">
        {department.projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-5 text-center">
            <p className="text-xs text-gray-500">
              No projects configured.
            </p>
          </div>
        ) : (
          department.projects.map((project) => (
            <ProjectSection
              key={project.id}
              project={project}
            />
          ))
        )}
      </div>
    </section>
  );
}