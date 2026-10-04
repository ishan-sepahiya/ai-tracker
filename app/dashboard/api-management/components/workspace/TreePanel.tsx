"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Cog,
  Folder,
  FolderOpen,
  Plus,
  Zap,
} from "lucide-react";

import type {
  DepartmentWithResources,
  EnvironmentWithResources,
  ProjectWithResources,
} from "@/lib/api-management/service";

/* ============================================================
   Selection model (shared with the workspace)
============================================================ */

export type Selection =
  | { kind: "org" }
  | { kind: "department"; id: string }
  | { kind: "project"; id: string; envId?: string };

/* ============================================================
   Filtering
============================================================ */

type TreeProject = {
  project: ProjectWithResources;
  environments: EnvironmentWithResources[];
};

type TreeDepartment = {
  department: DepartmentWithResources;
  projects: TreeProject[];
};

function matches(name: string, query: string) {
  return name.toLowerCase().includes(query);
}

function filterDepartments(
  departments: DepartmentWithResources[],
  rawQuery: string,
): TreeDepartment[] {
  const query = rawQuery.trim().toLowerCase();

  const all = (department: DepartmentWithResources): TreeDepartment => ({
    department,
    projects: department.projects.map((project) => ({
      project,
      environments: project.environments,
    })),
  });

  if (!query) return departments.map(all);

  const result: TreeDepartment[] = [];

  for (const department of departments) {
    if (matches(department.name, query)) {
      result.push(all(department));
      continue;
    }

    const projects: TreeProject[] = [];

    for (const project of department.projects) {
      if (matches(project.name, query)) {
        projects.push({ project, environments: project.environments });
        continue;
      }

      const environments = project.environments.filter((env) =>
        matches(env.name, query),
      );
      if (environments.length > 0) {
        projects.push({ project, environments });
      }
    }

    if (projects.length > 0) result.push({ department, projects });
  }

  return result;
}

/* ============================================================
   Row
============================================================ */

function Row({
  depth,
  selected,
  icon,
  label,
  count,
  expandable,
  open,
  onToggle,
  onSelect,
  onAdd,
  addLabel,
}: {
  depth: number;
  selected: boolean;
  icon: React.ReactNode;
  label: string;
  count?: number;
  expandable: boolean;
  open?: boolean;
  onToggle?: () => void;
  onSelect: () => void;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div
      className={`group flex items-center rounded-lg transition ${
        selected ? "bg-blue-50" : "hover:bg-slate-50"
      }`}
      style={{ paddingLeft: depth * 14 }}
    >
      {expandable ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label={open ? `Collapse ${label}` : `Expand ${label}`}
          aria-expanded={open}
          className="rounded p-1 text-slate-400 hover:text-slate-600"
        >
          {open ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : (
        <span className="w-6 shrink-0" aria-hidden />
      )}

      <button
        type="button"
        onClick={onSelect}
        aria-current={selected ? "true" : undefined}
        className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1 text-left text-sm ${
          selected ? "font-semibold text-blue-700" : "text-slate-700"
        }`}
      >
        {icon}
        <span className="truncate">{label}</span>
        {typeof count === "number" && (
          <span className="ml-auto shrink-0 text-xs font-normal text-slate-400">
            {count}
          </span>
        )}
      </button>

      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          aria-label={addLabel}
          title={addLabel}
          className="mr-1 rounded p-1 text-slate-400 opacity-0 transition hover:bg-white hover:text-blue-600 focus-visible:opacity-100 group-hover:opacity-100"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* ============================================================
   Panel
============================================================ */

export default function TreePanel({
  departments,
  selection,
  query,
  onSelect,
  onAddDepartment,
  onAddProject,
  onAddEnvironment,
}: {
  departments: DepartmentWithResources[];
  selection: Selection;
  query: string;
  onSelect: (selection: Selection) => void;
  onAddDepartment: () => void;
  onAddProject: (departmentId: string) => void;
  onAddEnvironment: (projectId: string) => void;
}) {
  // Everything is expanded by default; we only remember what the user collapsed.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const isSearching = query.trim().length > 0;

  const tree = useMemo(
    () => filterDepartments(departments, query),
    [departments, query],
  );

  function toggle(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isOpen = (id: string) => isSearching || !collapsed.has(id);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h2 className="text-sm font-semibold text-slate-900">
          Infrastructure Tree
        </h2>
        <button
          type="button"
          onClick={onAddDepartment}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-blue-600 transition hover:bg-blue-50"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          Department
        </button>
      </div>

      <div className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
        {departments.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-slate-500">
            No departments yet. Add one to start building your hierarchy.
          </p>
        )}

        {departments.length > 0 && tree.length === 0 && (
          <p className="px-3 py-6 text-center text-sm text-slate-500">
            Nothing matches “{query.trim()}”.
          </p>
        )}

        {tree.map(({ department, projects }) => {
          const deptOpen = isOpen(department.id);

          return (
            <div key={department.id}>
              <Row
                depth={0}
                selected={
                  selection.kind === "department" &&
                  selection.id === department.id
                }
                icon={
                  deptOpen ? (
                    <FolderOpen
                      className="h-4 w-4 shrink-0 text-blue-600"
                      aria-hidden
                    />
                  ) : (
                    <Folder
                      className="h-4 w-4 shrink-0 text-blue-600"
                      aria-hidden
                    />
                  )
                }
                label={department.name}
                count={department.projects.length}
                expandable={projects.length > 0}
                open={deptOpen}
                onToggle={() => toggle(department.id)}
                onSelect={() =>
                  onSelect({ kind: "department", id: department.id })
                }
                onAdd={() => onAddProject(department.id)}
                addLabel={`Add project to ${department.name}`}
              />

              {deptOpen &&
                projects.map(({ project, environments }) => {
                  const projectOpen = isOpen(project.id);

                  return (
                    <div key={project.id}>
                      <Row
                        depth={1}
                        selected={
                          selection.kind === "project" &&
                          selection.id === project.id &&
                          !selection.envId
                        }
                        icon={
                          <Cog
                            className="h-4 w-4 shrink-0 text-blue-500"
                            aria-hidden
                          />
                        }
                        label={project.name}
                        count={project.environments.length}
                        expandable={environments.length > 0}
                        open={projectOpen}
                        onToggle={() => toggle(project.id)}
                        onSelect={() =>
                          onSelect({ kind: "project", id: project.id })
                        }
                        onAdd={() => onAddEnvironment(project.id)}
                        addLabel={`Add environment to ${project.name}`}
                      />

                      {projectOpen &&
                        environments.map((environment) => (
                          <Row
                            key={environment.id}
                            depth={2}
                            selected={
                              selection.kind === "project" &&
                              selection.envId === environment.id
                            }
                            icon={
                              <Zap
                                className="h-4 w-4 shrink-0 text-amber-500"
                                aria-hidden
                              />
                            }
                            label={environment.name}
                            expandable={false}
                            onSelect={() =>
                              onSelect({
                                kind: "project",
                                id: project.id,
                                envId: environment.id,
                              })
                            }
                          />
                        ))}
                    </div>
                  );
                })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
