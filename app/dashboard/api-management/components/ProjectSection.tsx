import type { ProjectWithResources } from "@/lib/api-management/service";

import EnvironmentCard from "./EnvironmentCard";

type ProjectSectionProps = {
  project: ProjectWithResources;
};

export default function ProjectSection({
  project,
}: ProjectSectionProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Project Header */}
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-lg">
            📦
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-ink-black">
                {project.name}
              </h4>

              <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-600">
                Project
              </span>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              {project.environments.length}{" "}
              {project.environments.length === 1
                ? "environment"
                : "environments"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden font-mono text-xs text-gray-400 lg:block">
            {project.id.slice(0, 8)}…
          </div>

          <button
            type="button"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
          >
            Manage
          </button>
        </div>
      </div>

      {/* Environments */}
      <div className="border-t border-gray-100 bg-gray-50/50 p-4">
        {project.environments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-white p-5 text-center">
            <p className="text-xs text-gray-500">
              No environments configured for this project.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {project.environments.map((environment) => (
              <EnvironmentCard
                key={environment.id}
                environment={environment}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}