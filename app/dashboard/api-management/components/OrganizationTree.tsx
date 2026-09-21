"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  FolderKanban,
  LayoutGrid,
  List,
  Network,
  Pencil,
  Plus,
  Search,
  Server,
  Trash2,
  X,
} from "lucide-react";

import type { OrganizationTree as OrganizationTreeType } from "@/lib/api-management/service";
import { formatDate, getOrgCounts } from "@/lib/api-management/stats";

import DepartmentSection from "./DepartmentSection";

type ViewMode = "grid" | "list";
type SortKey = "name-asc" | "name-desc" | "newest" | "oldest" | "most-departments";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name-asc", label: "Name A–Z" },
  { value: "name-desc", label: "Name Z–A" },
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "most-departments", label: "Most departments" },
];

const AVATAR_COLORS = [
  "from-indigo-500 to-indigo-700",
  "from-sky-500 to-blue-700",
  "from-violet-500 to-purple-700",
  "from-emerald-500 to-teal-700",
  "from-rose-500 to-pink-700",
  "from-amber-500 to-orange-600",
];

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function timeOf(value: string | null) {
  return value ? new Date(value).getTime() : 0;
}

/* ============================================================
   Organization list + toolbar
============================================================ */

export default function OrganizationTree({
  organizations,
}: {
  organizations: OrganizationTreeType[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("name-asc");
  const [view, setView] = useState<ViewMode>("grid");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();

    const filtered = q
      ? organizations.filter((o) => o.name.toLowerCase().includes(q))
      : [...organizations];

    filtered.sort((a, b) => {
      switch (sort) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "newest":
          return timeOf(b.created_at) - timeOf(a.created_at);
        case "oldest":
          return timeOf(a.created_at) - timeOf(b.created_at);
        case "most-departments":
          return b.departments.length - a.departments.length;
        default:
          return a.name.localeCompare(b.name);
      }
    });

    return filtered;
  }, [organizations, query, sort]);

  if (organizations.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
          <Building2 className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-ink-black">
          No organizations yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
          Create your first organization to start managing departments,
          projects, environments, and API credentials.
        </p>
      </div>
    );
  }

  return (
    <section aria-label="Organizations" className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search organizations by name…"
            aria-label="Search organizations"
            className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-9 text-sm text-ink-black outline-none transition placeholder:text-gray-400 focus:border-dusk-blue focus:bg-white focus:ring-2 focus:ring-dusk-blue/20"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="relative">
            <span className="sr-only">Sort organizations</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-9 text-sm font-medium text-gray-700 outline-none transition hover:border-gray-300 focus:border-dusk-blue focus:ring-2 focus:ring-dusk-blue/20"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden
            />
          </label>

          <div
            role="group"
            aria-label="View mode"
            className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1"
          >
            {(
              [
                { mode: "grid", icon: LayoutGrid, label: "Grid view" },
                { mode: "list", icon: List, label: "List view" },
              ] as const
            ).map(({ mode, icon: Icon, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                aria-label={label}
                aria-pressed={view === mode}
                className={`rounded-md p-2 transition ${
                  view === mode
                    ? "bg-white text-ink-black shadow-sm"
                    : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="px-1 text-xs text-gray-500" aria-live="polite">
        Showing {visible.length} of {organizations.length}{" "}
        {organizations.length === 1 ? "organization" : "organizations"}
      </p>

      {/* Results */}
      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 text-gray-400">
            <Search className="h-6 w-6" aria-hidden />
          </div>
          <h3 className="mt-4 text-base font-semibold text-ink-black">
            No organizations found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Nothing matches “{query}”. Try a different name.
          </p>
          <button
            type="button"
            onClick={() => setQuery("")}
            className="mt-4 text-sm font-medium text-dusk-blue hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div
          className={
            view === "grid"
              ? "grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3"
              : "flex flex-col gap-3"
          }
        >
          {visible.map((organization) => (
            <OrganizationCard
              key={organization.id}
              organization={organization}
              view={view}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ============================================================
   Organization card
============================================================ */

function OrganizationCard({
  organization,
  view,
}: {
  organization: OrganizationTreeType;
  view: ViewMode;
}) {
  const router = useRouter();
  const counts = getOrgCounts(organization);
  const isList = view === "list";

  const [expanded, setExpanded] = useState(false);
  const [showDepartmentForm, setShowDepartmentForm] = useState(false);
  const [departmentName, setDepartmentName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(organization.name);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isActive = counts.environments > 0;

  async function request(
    url: string,
    method: string,
    body: Record<string, unknown>,
    fallback: string,
  ) {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || fallback);
  }

  async function handleCreateDepartment() {
    const name = departmentName.trim();
    if (!name) {
      setError("Department name is required.");
      return;
    }

    setIsCreating(true);
    setError(null);
    try {
      await request(
        "/api/team/departments",
        "POST",
        { organizationId: organization.id, name },
        "Failed to create department.",
      );
      setDepartmentName("");
      setShowDepartmentForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create department.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate() {
    const name = editName.trim();
    if (!name) {
      setError("Organization name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await request(
        "/api/team/organizations",
        "PATCH",
        { id: organization.id, name },
        "Failed to update organization.",
      );
      setIsEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update organization.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${organization.name}"?\n\nThis may also remove its associated departments, projects, environments, API keys, and provider credentials.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);
    try {
      await request(
        "/api/team/organizations",
        "DELETE",
        { id: organization.id },
        "Failed to delete organization.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete organization.");
      setIsDeleting(false);
    }
  }

  const stats = [
    { label: "Departments", value: counts.departments, icon: Network },
    { label: "Projects", value: counts.projects, icon: FolderKanban },
    { label: "Environments", value: counts.environments, icon: Server },
  ];

  /* ---- identity block (avatar + name / rename form) ---- */
  const identity = (
    <div className="flex min-w-0 items-center gap-3">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-lg font-bold text-white shadow-sm ${avatarColor(organization.id)}`}
        aria-hidden
      >
        {organization.name.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdate();
                if (e.key === "Escape") {
                  setEditName(organization.name);
                  setIsEditing(false);
                  setError(null);
                }
              }}
              disabled={isSaving}
              autoFocus
              aria-label="Organization name"
              className="w-40 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-ink-black outline-none focus:border-dusk-blue focus:ring-2 focus:ring-dusk-blue/20"
            />
            <button
              type="button"
              onClick={handleUpdate}
              disabled={isSaving}
              aria-label="Save name"
              className="rounded-lg bg-prussian-blue p-2 text-white transition hover:opacity-90 disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setEditName(organization.name);
                setIsEditing(false);
                setError(null);
              }}
              disabled={isSaving}
              aria-label="Cancel rename"
              className="rounded-lg border border-gray-300 p-2 text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <h2 className="truncate text-base font-semibold text-ink-black">
            {organization.name}
          </h2>
        )}

        <div className="mt-1 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
            <Building2 className="h-3 w-3" aria-hidden />
            Organization
          </span>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
              isActive
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-700"
            }`}
            title={
              isActive
                ? "Has at least one environment"
                : "No environments configured yet"
            }
          >
            <span className="relative flex h-2 w-2">
              {isActive && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  isActive ? "bg-emerald-500" : "bg-amber-500"
                }`}
              />
            </span>
            {isActive ? "Active" : "Setup needed"}
          </span>
        </div>
      </div>
    </div>
  );

  /* ---- resource pills ---- */
  const pills = (
    <div className={`grid grid-cols-3 gap-2 ${isList ? "md:w-80" : ""}`}>
      {stats.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5 text-center"
        >
          <Icon className="mx-auto h-4 w-4 text-dusk-blue" aria-hidden />
          <p className="mt-1 text-lg font-semibold leading-none text-ink-black">
            {value}
          </p>
          <p className="mt-1 truncate text-[11px] text-gray-500">{label}</p>
        </div>
      ))}
    </div>
  );

  /* ---- actions ---- */
  const actions = (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-prussian-blue px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:opacity-90"
      >
        {expanded ? "Hide Departments" : "View Departments"}
        <ChevronDown
          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      <button
        type="button"
        onClick={() => {
          setEditName(organization.name);
          setError(null);
          setIsEditing(true);
        }}
        aria-label={`Edit ${organization.name}`}
        className="rounded-lg border border-gray-200 bg-white p-2.5 text-gray-600 transition hover:bg-gray-100"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        aria-label={`Delete ${organization.name}`}
        className="rounded-lg border border-red-200 bg-white p-2.5 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );

  const created = (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
      <CalendarDays className="h-3.5 w-3.5" aria-hidden />
      Created {formatDate(organization.created_at)}
    </span>
  );

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md ${
        expanded && !isList ? "md:col-span-2 xl:col-span-3" : ""
      }`}
    >
      {isList ? (
        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div className="md:w-72">{identity}</div>
          {pills}
          <div className="flex flex-col gap-2 md:items-end">
            {created}
            {actions}
          </div>
        </div>
      ) : (
        <div className="space-y-4 p-5">
          {identity}
          {pills}
          <div className="flex items-center justify-between border-t border-gray-100 pt-4">
            {created}
          </div>
          {actions}
        </div>
      )}

      {error && !expanded && (
        <p className="border-t border-red-100 bg-red-50 px-5 py-2 text-sm text-red-600">
          {error}
        </p>
      )}

      {/* Expanded: departments */}
      {expanded && (
        <div className="space-y-4 border-t border-gray-200 bg-gray-50/60 p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-700">Departments</h3>
            {!showDepartmentForm && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setShowDepartmentForm(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Department
              </button>
            )}
          </div>

          {organization.departments.length === 0 && !showDepartmentForm && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center text-sm text-gray-500">
              No departments in this organization yet.
            </div>
          )}

          {showDepartmentForm && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label
                    htmlFor={`department-${organization.id}`}
                    className="mb-1.5 block text-sm font-medium text-gray-700"
                  >
                    Department name
                  </label>
                  <input
                    id={`department-${organization.id}`}
                    type="text"
                    value={departmentName}
                    onChange={(e) => setDepartmentName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateDepartment();
                    }}
                    disabled={isCreating}
                    autoFocus
                    placeholder="e.g. Engineering"
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-ink-black outline-none placeholder:text-gray-400 focus:border-dusk-blue focus:ring-2 focus:ring-dusk-blue/20"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCreateDepartment}
                    disabled={isCreating}
                    className="rounded-lg bg-prussian-blue px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreating ? "Creating..." : "Create"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDepartmentName("");
                      setError(null);
                      setShowDepartmentForm(false);
                    }}
                    disabled={isCreating}
                    className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            </div>
          )}

          <div className="space-y-4">
            {organization.departments.map((department) => (
              <DepartmentSection key={department.id} department={department} />
            ))}
          </div>
        </div>
      )}
    </article>
  );
}