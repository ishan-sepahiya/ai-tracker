"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  FolderGit2,
  Layers,
  Pencil,
  Search,
  Server,
  Trash2,
  X,
} from "lucide-react";

import type {
  DepartmentWithResources,
  OrganizationTree as OrganizationTreeType,
  ProjectWithResources,
} from "@/lib/api-management/service";

/* ============================================================
   Types
============================================================ */

type OrganizationTreeProps = {
  organizations: OrganizationTreeType[];
};

type FilteredDepartment = {
  department: DepartmentWithResources;
  projects: ProjectWithResources[];
};

type FilteredOrganization = {
  organization: OrganizationTreeType;
  departments: FilteredDepartment[];
};

/* ============================================================
   Helpers
============================================================ */

function includes(value: string | null | undefined, query: string) {
  return !!value && value.toLowerCase().includes(query);
}

/** Filters the tree by a search query, keeping ancestors of any match. */
function filterTree(
  organizations: OrganizationTreeType[],
  rawQuery: string,
): FilteredOrganization[] {
  const query = rawQuery.trim().toLowerCase();

  if (!query) {
    return organizations.map((organization) => ({
      organization,
      departments: organization.departments.map((department) => ({
        department,
        projects: department.projects,
      })),
    }));
  }

  const result: FilteredOrganization[] = [];

  for (const organization of organizations) {
    // Organization name matches -> keep its whole subtree
    if (includes(organization.name, query)) {
      result.push({
        organization,
        departments: organization.departments.map((department) => ({
          department,
          projects: department.projects,
        })),
      });
      continue;
    }

    const departments: FilteredDepartment[] = [];

    for (const department of organization.departments) {
      // Department name matches -> keep all of its projects
      if (includes(department.name, query)) {
        departments.push({ department, projects: department.projects });
        continue;
      }

      const projects = department.projects.filter(
        (project) =>
          includes(project.name, query) ||
          project.environments.some((env) => includes(env.name, query)),
      );

      if (projects.length > 0) {
        departments.push({ department, projects });
      }
    }

    if (departments.length > 0) {
      result.push({ organization, departments });
    }
  }

  return result;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function plural(count: number, singular: string, pluralForm?: string) {
  return `${count} ${count === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;

  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));

  return (
    <>
      {parts.map((part, index) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <mark
            key={index}
            className="rounded bg-amber-100 px-0.5 text-inherit"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

/* ============================================================
   Component
============================================================ */

export default function OrganizationTree({
  organizations,
}: OrganizationTreeProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  // Edit / delete state (one organization per user, but kept per-id)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Expansion is tracked independently per level
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());

  const isSearching = query.trim().length > 0;

  const tree = useMemo(
    () => filterTree(organizations, query),
    [organizations, query],
  );

  function toggle(
    setter: React.Dispatch<React.SetStateAction<Set<string>>>,
    id: string,
  ) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startEditing(organization: OrganizationTreeType) {
    setActionError(null);
    setEditName(organization.name);
    setEditingId(organization.id);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditName("");
    setActionError(null);
  }

  async function saveName(organization: OrganizationTreeType) {
    const name = editName.trim();

    if (!name) {
      setActionError("Organization name is required.");
      return;
    }

    if (name === organization.name) {
      cancelEditing();
      return;
    }

    setBusyId(organization.id);
    setActionError(null);

    try {
      const response = await fetch("/api/team/organizations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: organization.id, name }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to update organization.");
      }

      cancelEditing();
      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to update organization.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteOrganization(organization: OrganizationTreeType) {
    const confirmed = window.confirm(
      `Delete "${organization.name}"?\n\nThis permanently removes its departments, projects, environments, API keys, and provider credentials. You can create a new organization afterwards.`,
    );

    if (!confirmed) return;

    setBusyId(organization.id);
    setActionError(null);

    try {
      const response = await fetch("/api/team/organizations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: organization.id }),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete organization.");
      }

      router.refresh();
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : "Failed to delete organization.",
      );
    } finally {
      setBusyId(null);
    }
  }

  function expandAll() {
    setExpandedOrgs(new Set(organizations.map((o) => o.id)));
    setExpandedDepts(
      new Set(organizations.flatMap((o) => o.departments.map((d) => d.id))),
    );
  }

  function collapseAll() {
    setExpandedOrgs(new Set());
    setExpandedDepts(new Set());
  }

  /* ---------- Empty: no organizations at all ---------- */
  if (organizations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-100">
          <Building2 className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          No organizations yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Use the Create Organization button above to get started. Each
          account can have one organization.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Organization hierarchy" className="space-y-4">
      {/* ---------------- Toolbar ---------------- */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search organizations, departments, projects…"
            aria-label="Search organization tree"
            className="w-full rounded-xl border border-slate-100 bg-white py-2.5 pl-10 pr-10 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!isSearching && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Expand all
            </button>
            <button
              type="button"
              onClick={collapseAll}
              className="rounded-xl border border-slate-100 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition hover:bg-slate-50"
            >
              Collapse all
            </button>
          </div>
        )}
      </div>

      {isSearching && (
        <p className="px-1 text-xs text-slate-500" aria-live="polite">
          {tree.length === 0
            ? "No results"
            : `${plural(tree.length, "organization")} matching “${query.trim()}”`}
        </p>
      )}

      {/* ---------------- No search results ---------------- */}
      {tree.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-100">
            <Search className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="mt-4 text-base font-semibold text-slate-900">
            No organizations found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Nothing matches “{query.trim()}”. Try a different name.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-4 text-sm font-medium text-slate-700 underline-offset-4 hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {tree.map(({ organization, departments }) => {
            // While searching, everything visible is auto-expanded
            const orgOpen = isSearching || expandedOrgs.has(organization.id);
            const orgPanelId = `org-panel-${organization.id}`;

            const projectCount = organization.departments.reduce(
              (sum, d) => sum + d.projects.length,
              0,
            );

            return (
              <li
                key={organization.id}
                className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm"
              >
                {/* ============ Level 1: Organization ============ */}
                <div className="flex items-center gap-2 pr-3 transition hover:bg-slate-50/70">
                  {editingId === organization.id ? (
                    <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                        <Building2 className="h-5 w-5" aria-hidden />
                      </span>
                      <input
                        type="text"
                        value={editName}
                        onChange={(event) => setEditName(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") saveName(organization);
                          if (event.key === "Escape") cancelEditing();
                        }}
                        disabled={busyId === organization.id}
                        maxLength={100}
                        autoFocus
                        aria-label="Organization name"
                        className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-300 focus:ring-4 focus:ring-slate-100"
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggle(setExpandedOrgs, organization.id)}
                      aria-expanded={orgOpen}
                      aria-controls={orgPanelId}
                      className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3.5 text-left"
                    >
                      {orgOpen ? (
                        <ChevronDown
                          className="h-4 w-4 shrink-0 text-slate-400"
                          aria-hidden
                        />
                      ) : (
                        <ChevronRight
                          className="h-4 w-4 shrink-0 text-slate-400"
                          aria-hidden
                        />
                      )}

                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                        <Building2 className="h-5 w-5" aria-hidden />
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">
                          <Highlight text={organization.name} query={query} />
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">
                          {plural(organization.departments.length, "department")}{" "}
                          · {plural(projectCount, "project")}
                        </span>
                      </span>

                      <span className="hidden items-center gap-1.5 text-xs text-slate-400 md:inline-flex">
                        <CalendarDays className="h-3.5 w-3.5" aria-hidden />
                        {formatDate(organization.created_at)}
                      </span>
                    </button>
                  )}

                  {/* Row actions: edit + delete only */}
                  <div className="flex shrink-0 items-center gap-1.5">
                    {editingId === organization.id ? (
                      <>
                        <button
                          type="button"
                          onClick={() => saveName(organization)}
                          disabled={busyId === organization.id}
                          aria-label="Save name"
                          className="rounded-lg bg-slate-900 p-2 text-white transition hover:bg-slate-800 disabled:opacity-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          disabled={busyId === organization.id}
                          aria-label="Cancel rename"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => startEditing(organization)}
                          disabled={busyId === organization.id}
                          aria-label={`Edit ${organization.name}`}
                          title="Edit organization"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteOrganization(organization)}
                          disabled={busyId === organization.id}
                          aria-label={`Delete ${organization.name}`}
                          title="Delete organization"
                          className="rounded-lg border border-red-100 bg-white p-2 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {actionError && (
                  <p
                    role="alert"
                    className="border-t border-red-100 bg-red-50 px-4 py-2 text-sm text-red-600"
                  >
                    {actionError}
                  </p>
                )}

                {/* ============ Level 2: Departments ============ */}
                {orgOpen && (
                  <div
                    id={orgPanelId}
                    className="border-t border-slate-100 bg-slate-50/70 px-4 py-3"
                  >
                    {departments.length === 0 ? (
                      <p className="py-2 pl-7 text-sm text-slate-500">
                        No departments in this organization yet.
                      </p>
                    ) : (
                      <ul className="ml-3 space-y-2 border-l border-slate-200 pl-4">
                        {departments.map(({ department, projects }) => {
                          const deptOpen =
                            isSearching || expandedDepts.has(department.id);
                          const deptPanelId = `dept-panel-${department.id}`;

                          return (
                            <li
                              key={department.id}
                              className="rounded-xl border border-slate-100 bg-white"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  toggle(setExpandedDepts, department.id)
                                }
                                aria-expanded={deptOpen}
                                aria-controls={deptPanelId}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50/70"
                              >
                                {deptOpen ? (
                                  <ChevronDown
                                    className="h-4 w-4 shrink-0 text-slate-400"
                                    aria-hidden
                                  />
                                ) : (
                                  <ChevronRight
                                    className="h-4 w-4 shrink-0 text-slate-400"
                                    aria-hidden
                                  />
                                )}

                                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                  <Layers className="h-4 w-4" aria-hidden />
                                </span>

                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-sm font-medium text-slate-900">
                                    <Highlight
                                      text={department.name}
                                      query={query}
                                    />
                                  </span>
                                </span>

                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                  {plural(department.projects.length, "project")}
                                </span>
                              </button>

                              {/* ============ Level 3: Projects ============ */}
                              {deptOpen && (
                                <div
                                  id={deptPanelId}
                                  className="border-t border-slate-100 px-3 py-3"
                                >
                                  {projects.length === 0 ? (
                                    <p className="py-1 pl-7 text-sm text-slate-500">
                                      No projects in this department yet.
                                    </p>
                                  ) : (
                                    <ul className="ml-3 space-y-2 border-l border-slate-200 pl-4">
                                      {projects.map((project) => (
                                        <li
                                          key={project.id}
                                          className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                                        >
                                          <div className="flex min-w-0 items-center gap-3">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                              <FolderGit2
                                                className="h-4 w-4"
                                                aria-hidden
                                              />
                                            </span>
                                            <div className="min-w-0">
                                              <p className="truncate text-sm font-medium text-slate-900">
                                                <Highlight
                                                  text={project.name}
                                                  query={query}
                                                />
                                              </p>
                                              <p className="text-xs text-slate-500">
                                                Created{" "}
                                                {formatDate(project.created_at)}
                                              </p>
                                            </div>
                                          </div>

                                          {/* Deployment info: environments */}
                                          <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                                            {project.environments.length ===
                                            0 ? (
                                              <span className="text-xs text-slate-400">
                                                No environments
                                              </span>
                                            ) : (
                                              project.environments.map(
                                                (env) => (
                                                  <span
                                                    key={env.id}
                                                    title={plural(
                                                      env.apiKeys.length,
                                                      "API key",
                                                    )}
                                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs font-medium text-slate-600"
                                                  >
                                                    <Server
                                                      className="h-3 w-3 text-slate-400"
                                                      aria-hidden
                                                    />
                                                    <Highlight
                                                      text={env.name}
                                                      query={query}
                                                    />
                                                    <span className="text-slate-400">
                                                      · {env.apiKeys.length}
                                                    </span>
                                                  </span>
                                                ),
                                              )
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}