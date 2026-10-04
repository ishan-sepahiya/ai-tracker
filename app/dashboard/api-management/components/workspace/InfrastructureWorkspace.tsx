"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Building2,
  ChevronRight,
  Cog,
  Folder,
  KeyRound,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";

import type {
  DepartmentWithResources,
  OrganizationTree,
  ProjectWithResources,
} from "@/lib/api-management/service";
import { getProjectInsights } from "@/lib/api-management/insights";
import { teamRequest } from "@/lib/api-management/client";

import EnvironmentCard from "../EnvironmentCard";
import ProviderCredentialCard from "../ProvideCeredentialCard";
import CreateProviderCredentialModal from "../CreateProviderCredentialModal";

import EnvironmentSummaryCard from "./EnvironmentSummaryCard";
import TreePanel, { type Selection } from "./TreePanel";
import { KebabMenu, Modal, ResourceDialog } from "./WorkspaceUI";

/* ============================================================
   Constants & types
============================================================ */

type ResourceKind = "organization" | "department" | "project" | "environment";

const ENDPOINTS: Record<ResourceKind, string> = {
  organization: "/api/team/organizations",
  department: "/api/team/departments",
  project: "/api/team/projects",
  environment: "/api/team/environments",
};

type DialogState =
  | { type: "add-department" }
  | { type: "add-project"; departmentId: string }
  | { type: "add-environment"; projectId: string }
  | { type: "rename"; target: ResourceKind; id: string; current: string };

/* ============================================================
   Selection helpers
============================================================ */

function findProject(
  organization: OrganizationTree,
  projectId: string,
): { department: DepartmentWithResources; project: ProjectWithResources } | null {
  for (const department of organization.departments) {
    for (const project of department.projects) {
      if (project.id === projectId) return { department, project };
    }
  }
  return null;
}

function defaultSelection(organization: OrganizationTree): Selection {
  const firstDepartment = organization.departments[0];
  const firstProject = organization.departments.flatMap((d) => d.projects)[0];

  if (firstProject) return { kind: "project", id: firstProject.id };
  if (firstDepartment) return { kind: "department", id: firstDepartment.id };
  return { kind: "org" };
}

/** Turns a deep-link value like "project:<id>" into a selection. */
function parseNode(
  organization: OrganizationTree,
  node: string | null,
): Selection | null {
  if (!node) return null;

  const separator = node.indexOf(":");
  if (separator === -1) return null;

  const type = node.slice(0, separator);
  const id = node.slice(separator + 1);

  if (type === "department") {
    return organization.departments.some((d) => d.id === id)
      ? { kind: "department", id }
      : null;
  }

  if (type === "project") {
    return findProject(organization, id) ? { kind: "project", id } : null;
  }

  if (type === "env") {
    for (const department of organization.departments) {
      for (const project of department.projects) {
        if (project.environments.some((e) => e.id === id)) {
          return { kind: "project", id: project.id, envId: id };
        }
      }
    }
  }

  return null;
}

function encodeNode(selection: Selection): string | null {
  if (selection.kind === "department") return `department:${selection.id}`;
  if (selection.kind === "project") {
    return selection.envId
      ? `env:${selection.envId}`
      : `project:${selection.id}`;
  }
  return null;
}

/** Falls back gracefully if the selected item was deleted. */
function resolveSelection(
  organization: OrganizationTree,
  selection: Selection,
): Selection {
  if (selection.kind === "org") return selection;

  if (selection.kind === "department") {
    return organization.departments.some((d) => d.id === selection.id)
      ? selection
      : defaultSelection(organization);
  }

  const found = findProject(organization, selection.id);
  if (!found) return defaultSelection(organization);

  if (
    selection.envId &&
    !found.project.environments.some((e) => e.id === selection.envId)
  ) {
    return { kind: "project", id: selection.id };
  }

  return selection;
}

function syncUrl(selection: Selection) {
  const url = new URL(window.location.href);
  const node = encodeNode(selection);

  if (node) url.searchParams.set("node", node);
  else url.searchParams.delete("node");

  window.history.replaceState(null, "", url);
}

/* ============================================================
   Small presentational pieces
============================================================ */

function AddCard({
  label,
  hint,
  onClick,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-6 text-center transition hover:border-blue-300 hover:bg-blue-50/40"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 ring-1 ring-slate-100">
        <Plus className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hint && <span className="text-xs text-slate-500">{hint}</span>}
    </button>
  );
}

function ResourceCard({
  icon,
  title,
  meta,
  chips,
  openLabel,
  onOpen,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  chips?: string[];
  openLabel: string;
  onOpen: () => void;
}) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-slate-900">
            {title}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">{meta}</p>
        </div>
      </div>

      {chips && chips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {chips.slice(0, 4).map((chip) => (
            <span
              key={chip}
              className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600"
            >
              {chip}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onOpen}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50/40 px-4 py-2.5 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
      >
        {openLabel}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </article>
  );
}

/* ============================================================
   Workspace
============================================================ */

export default function InfrastructureWorkspace({
  organizations,
  initialNode,
}: {
  organizations: OrganizationTree[];
  initialNode: string | null;
}) {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [now] = useState(() => Date.now());
  const [activeOrgId, setActiveOrgId] = useState(organizations[0].id);
  const organization =
    organizations.find((o) => o.id === activeOrgId) ?? organizations[0];

  const [selection, setSelection] = useState<Selection>(
    () =>
      parseNode(organization, initialNode) ?? defaultSelection(organization),
  );
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [detailsEnvId, setDetailsEnvId] = useState<string | null>(null);
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  // ⌘K / Ctrl+K focuses the filter
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const resolved = useMemo(
    () => resolveSelection(organization, selection),
    [organization, selection],
  );

  const selectedProject =
    resolved.kind === "project" ? findProject(organization, resolved.id) : null;

  const selectedDepartment =
    resolved.kind === "department"
      ? (organization.departments.find((d) => d.id === resolved.id) ?? null)
      : (selectedProject?.department ?? null);

  const detailsEnvironment =
    selectedProject && detailsEnvId
      ? (selectedProject.project.environments.find(
          (e) => e.id === detailsEnvId,
        ) ?? null)
      : null;

  /* ---------------- actions ---------------- */

  function select(next: Selection) {
    setSelection(next);
    syncUrl(next);

    if (next.kind === "project" && next.envId) {
      requestAnimationFrame(() => {
        document
          .getElementById(`env-${next.envId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }

  function openAddProject() {
    if (organization.departments.length === 0) {
      setDialog({ type: "add-department" });
      return;
    }

    setDialog({
      type: "add-project",
      departmentId:
        selectedDepartment?.id ?? organization.departments[0].id,
    });
  }

  async function submitDialog(
    current: DialogState,
    name: string,
    selectedValue: string,
  ) {
    switch (current.type) {
      case "add-department": {
        const result = await teamRequest<{ department?: { id: string } }>(
          ENDPOINTS.department,
          "POST",
          { organizationId: organization.id, name },
          "Failed to create department.",
        );
        if (result.department?.id) {
          select({ kind: "department", id: result.department.id });
        }
        break;
      }

      case "add-project": {
        const result = await teamRequest<{ project?: { id: string } }>(
          ENDPOINTS.project,
          "POST",
          { departmentId: selectedValue || current.departmentId, name },
          "Failed to create project.",
        );
        if (result.project?.id) {
          select({ kind: "project", id: result.project.id });
        }
        break;
      }

      case "add-environment": {
        const result = await teamRequest<{ environment?: { id: string } }>(
          ENDPOINTS.environment,
          "POST",
          { projectId: current.projectId, name },
          "Failed to create environment.",
        );
        if (result.environment?.id) {
          select({
            kind: "project",
            id: current.projectId,
            envId: result.environment.id,
          });
        }
        break;
      }

      case "rename": {
        await teamRequest(
          ENDPOINTS[current.target],
          "PATCH",
          { id: current.id, name },
          `Failed to rename ${current.target}.`,
        );
        break;
      }
    }

    router.refresh();
  }

  async function remove(target: ResourceKind, id: string, name: string) {
    const warning =
      target === "environment"
        ? "Its API keys and provider credentials will also be deleted."
        : target === "project"
          ? "Its environments, API keys, and provider credentials will also be deleted."
          : target === "department"
            ? "Its projects, environments, API keys, and provider credentials will also be deleted."
            : "Everything inside it will be permanently deleted. You can create a new organization afterwards.";

    const confirmed = window.confirm(
      `Delete ${target} "${name}"?\n\n${warning}`,
    );
    if (!confirmed) return;

    setBanner(null);

    try {
      await teamRequest(
        ENDPOINTS[target],
        "DELETE",
        { id },
        `Failed to delete ${target}.`,
      );
      router.refresh();
    } catch (error) {
      setBanner(
        error instanceof Error ? error.message : `Failed to delete ${target}.`,
      );
    }
  }

  /* ---------------- dialog rendering ---------------- */

  function renderDialog() {
    if (!dialog) return null;
    const close = () => setDialog(null);
    const onSubmit = (name: string, value: string) =>
      submitDialog(dialog, name, value);

    switch (dialog.type) {
      case "add-department":
        return (
          <ResourceDialog
            title="Add department"
            description={
              organization.departments.length === 0
                ? "Projects live inside departments. Create your first department, then add a project."
                : `Create a department in ${organization.name}.`
            }
            label="Department name"
            placeholder="e.g. Engineering"
            submitLabel="Create department"
            onSubmit={onSubmit}
            onClose={close}
          />
        );

      case "add-project":
        return (
          <ResourceDialog
            title="Add project"
            label="Project name"
            placeholder="e.g. Backend Engineering"
            submitLabel="Create project"
            select={{
              label: "Department",
              initial: dialog.departmentId,
              options: organization.departments.map((d) => ({
                value: d.id,
                label: d.name,
              })),
            }}
            onSubmit={onSubmit}
            onClose={close}
          />
        );

      case "add-environment": {
        const project = findProject(organization, dialog.projectId)?.project;
        return (
          <ResourceDialog
            title="Add environment"
            description={
              project ? `Create an environment in ${project.name}.` : undefined
            }
            label="Environment name"
            placeholder="e.g. Production"
            submitLabel="Create environment"
            onSubmit={onSubmit}
            onClose={close}
          />
        );
      }

      case "rename":
        return (
          <ResourceDialog
            title={`Rename ${dialog.target}`}
            label="Name"
            initialValue={dialog.current}
            submitLabel="Save"
            onSubmit={onSubmit}
            onClose={close}
          />
        );
    }
  }

  /* ---------------- right-hand content ---------------- */

  function renderBreadcrumb() {
    return (
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-wrap items-center gap-1.5 text-sm"
      >
        <button
          type="button"
          onClick={() => select({ kind: "org" })}
          className={`truncate transition hover:text-blue-600 ${
            resolved.kind === "org"
              ? "font-semibold text-blue-600"
              : "text-slate-500"
          }`}
        >
          {organization.name}
        </button>

        {selectedDepartment && (
          <>
            <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
            <button
              type="button"
              onClick={() =>
                select({ kind: "department", id: selectedDepartment.id })
              }
              className={`truncate transition hover:text-blue-600 ${
                resolved.kind === "department"
                  ? "font-semibold text-blue-600"
                  : "text-slate-500"
              }`}
            >
              {selectedDepartment.name}
            </button>
          </>
        )}

        {selectedProject && (
          <>
            <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden />
            <span className="truncate font-semibold text-blue-600">
              {selectedProject.project.name}
            </span>
          </>
        )}
      </nav>
    );
  }

  function renderContent() {
    /* ---------- Project view: environment cards ---------- */
    if (selectedProject) {
      const { project } = selectedProject;
      const insights = getProjectInsights(project, now);

      return (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              {renderBreadcrumb()}
              <p className="text-sm text-slate-500">
                {insights.environments}{" "}
                {insights.environments === 1 ? "environment" : "environments"}{" "}
                · {insights.activeKeys} active{" "}
                {insights.activeKeys === 1 ? "key" : "keys"} ·{" "}
                {insights.providers.length}{" "}
                {insights.providers.length === 1 ? "provider" : "providers"}
              </p>
            </div>

            <KebabMenu
              label={`Actions for ${project.name}`}
              items={[
                {
                  label: "Add environment",
                  icon: Plus,
                  onClick: () =>
                    setDialog({ type: "add-environment", projectId: project.id }),
                },
                {
                  label: "Add provider credential",
                  icon: KeyRound,
                  onClick: () => setShowProviderModal(true),
                },
                {
                  label: "Rename project",
                  icon: Pencil,
                  onClick: () =>
                    setDialog({
                      type: "rename",
                      target: "project",
                      id: project.id,
                      current: project.name,
                    }),
                },
                {
                  label: "Delete project",
                  icon: Trash2,
                  danger: true,
                  onClick: () => remove("project", project.id, project.name),
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            {project.environments.map((environment, index) => (
              <EnvironmentSummaryCard
                key={environment.id}
                environment={environment}
                project={project}
                index={index}
                now={now}
                highlighted={resolved.kind === "project" && resolved.envId === environment.id}
                onViewDetails={() => setDetailsEnvId(environment.id)}
                onRename={() =>
                  setDialog({
                    type: "rename",
                    target: "environment",
                    id: environment.id,
                    current: environment.name,
                  })
                }
                onDelete={() =>
                  remove("environment", environment.id, environment.name)
                }
              />
            ))}

            <AddCard
              label="Add environment"
              hint="e.g. Production, Staging, Development"
              onClick={() =>
                setDialog({ type: "add-environment", projectId: project.id })
              }
            />
          </div>

          {/* Project-wide provider credentials */}
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Project provider credentials
                </h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  Shared by every environment in this project.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProviderModal(true)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Add credential
              </button>
            </div>

            {project.providerCredentials.length > 0 ? (
              <div className="mt-4 space-y-3">
                {project.providerCredentials.map((credential) => (
                  <ProviderCredentialCard
                    key={credential.id}
                    credential={credential}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-center text-sm text-slate-500">
                No project-wide credentials yet.
              </p>
            )}
          </section>
        </>
      );
    }

    /* ---------- Department view: project cards ---------- */
    if (selectedDepartment) {
      return (
        <>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              {renderBreadcrumb()}
              <p className="text-sm text-slate-500">
                {selectedDepartment.projects.length}{" "}
                {selectedDepartment.projects.length === 1
                  ? "project"
                  : "projects"}
              </p>
            </div>

            <KebabMenu
              label={`Actions for ${selectedDepartment.name}`}
              items={[
                {
                  label: "Add project",
                  icon: Plus,
                  onClick: () =>
                    setDialog({
                      type: "add-project",
                      departmentId: selectedDepartment.id,
                    }),
                },
                {
                  label: "Rename department",
                  icon: Pencil,
                  onClick: () =>
                    setDialog({
                      type: "rename",
                      target: "department",
                      id: selectedDepartment.id,
                      current: selectedDepartment.name,
                    }),
                },
                {
                  label: "Delete department",
                  icon: Trash2,
                  danger: true,
                  onClick: () =>
                    remove(
                      "department",
                      selectedDepartment.id,
                      selectedDepartment.name,
                    ),
                },
              ]}
            />
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {selectedDepartment.projects.map((project) => {
              const insights = getProjectInsights(project, now);
              return (
                <ResourceCard
                  key={project.id}
                  icon={<Cog className="h-5 w-5" aria-hidden />}
                  title={project.name}
                  meta={`${insights.environments} ${
                    insights.environments === 1 ? "environment" : "environments"
                  } · ${insights.activeKeys} active ${
                    insights.activeKeys === 1 ? "key" : "keys"
                  }`}
                  chips={insights.providers}
                  openLabel="Open project"
                  onOpen={() => select({ kind: "project", id: project.id })}
                />
              );
            })}

            <AddCard
              label="Add project"
              onClick={() =>
                setDialog({
                  type: "add-project",
                  departmentId: selectedDepartment.id,
                })
              }
            />
          </div>
        </>
      );
    }

    /* ---------- Organization view: department cards ---------- */
    return (
      <>
        <div className="space-y-1">
          {renderBreadcrumb()}
          <p className="text-sm text-slate-500">
            {organization.departments.length}{" "}
            {organization.departments.length === 1
              ? "department"
              : "departments"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {organization.departments.map((department) => {
            const environmentCount = department.projects.reduce(
              (sum, p) => sum + p.environments.length,
              0,
            );
            return (
              <ResourceCard
                key={department.id}
                icon={<Folder className="h-5 w-5" aria-hidden />}
                title={department.name}
                meta={`${department.projects.length} ${
                  department.projects.length === 1 ? "project" : "projects"
                } · ${environmentCount} ${
                  environmentCount === 1 ? "environment" : "environments"
                }`}
                openLabel="Open department"
                onOpen={() =>
                  select({ kind: "department", id: department.id })
                }
              />
            );
          })}

          <AddCard
            label="Add department"
            hint={
              organization.departments.length === 0
                ? "Start by creating your first department"
                : undefined
            }
            onClick={() => setDialog({ type: "add-department" })}
          />
        </div>
      </>
    );
  }

  /* ---------------- render ---------------- */

  return (
    <div className="space-y-5">
      {/* Header */}
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Building2 className="h-6 w-6" aria-hidden />
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              API Management
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-xl font-semibold text-slate-900">
                {organization.name}
              </h1>

              {organizations.length === 1 ? (
                <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  Single org
                </span>
              ) : (
                <>
                  <select
                    value={organization.id}
                    onChange={(event) => {
                      setActiveOrgId(event.target.value);
                      setSelection({ kind: "org" });
                      setQuery("");
                    }}
                    aria-label="Switch organization"
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700"
                  >
                    {organizations.map((org) => (
                      <option key={org.id} value={org.id}>
                        {org.name}
                      </option>
                    ))}
                  </select>
                  <span
                    className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700"
                    title="Each account should have only one organization. Delete the extras."
                  >
                    <AlertTriangle className="h-3 w-3" aria-hidden />
                    {organizations.length} orgs · limit is 1
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative sm:w-72">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter resources…"
              aria-label="Filter resources"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2.5 pl-9 pr-16 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear filter"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-slate-500 sm:block">
                Ctrl K
              </kbd>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openAddProject}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 sm:flex-none"
            >
              <Plus className="h-4 w-4" aria-hidden />
              Add Project
            </button>

            <KebabMenu
              label="Organization actions"
              items={[
                {
                  label: "Rename organization",
                  icon: Pencil,
                  onClick: () =>
                    setDialog({
                      type: "rename",
                      target: "organization",
                      id: organization.id,
                      current: organization.name,
                    }),
                },
                {
                  label: "Delete organization",
                  icon: Trash2,
                  danger: true,
                  onClick: () =>
                    remove("organization", organization.id, organization.name),
                },
              ]}
            />
          </div>
        </div>
      </header>

      {banner && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          <span>{banner}</span>
          <button
            type="button"
            onClick={() => setBanner(null)}
            aria-label="Dismiss"
            className="shrink-0 text-red-400 hover:text-red-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Workspace */}
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
        <aside className="flex max-h-96 flex-col rounded-2xl border border-slate-100 bg-white shadow-sm lg:sticky lg:top-6 lg:max-h-[calc(100vh-9rem)]">
          <TreePanel
            departments={organization.departments}
            selection={resolved}
            query={query}
            onSelect={select}
            onAddDepartment={() => setDialog({ type: "add-department" })}
            onAddProject={(departmentId) =>
              setDialog({ type: "add-project", departmentId })
            }
            onAddEnvironment={(projectId) =>
              setDialog({ type: "add-environment", projectId })
            }
          />
        </aside>

        <section className="min-w-0 space-y-5">{renderContent()}</section>
      </div>

      {/* Dialogs */}
      {renderDialog()}

      {detailsEnvironment && selectedProject && (
        <Modal
          size="lg"
          title={`${detailsEnvironment.name} · ${selectedProject.project.name}`}
          description="Manage API keys and provider credentials for this environment."
          onClose={() => setDetailsEnvId(null)}
        >
          <EnvironmentCard
            environment={detailsEnvironment}
            projectId={selectedProject.project.id}
            projectName={selectedProject.project.name}
          />
        </Modal>
      )}

      {showProviderModal && selectedProject && (
        <CreateProviderCredentialModal
          projectId={selectedProject.project.id}
          projectName={selectedProject.project.name}
          onClose={() => setShowProviderModal(false)}
          onCreated={() => {
            setShowProviderModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
