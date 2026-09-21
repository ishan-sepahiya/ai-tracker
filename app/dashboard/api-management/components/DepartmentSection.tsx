"use client";

import { useState } from "react";

import type {
  DepartmentWithResources,
} from "@/lib/api-management/service";

import ProjectSection from "./ProjectSection";

type DepartmentSectionProps = {
  department: DepartmentWithResources;
};

export default function DepartmentSection({
  department,
}: DepartmentSectionProps) {
  const [isExpanded, setIsExpanded] =
    useState(false);

  const [isEditing, setIsEditing] =
    useState(false);

  const [name, setName] =
    useState(department.name);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [showProjectForm, setShowProjectForm] =
    useState(false);

  const [projectName, setProjectName] =
    useState("");

  const [isCreatingProject, setIsCreatingProject] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* =========================================================
     CALCULATE DEPARTMENT METRICS
  ========================================================= */

  const totalProjects =
    department.projects.length;

  const totalEnvironments =
    department.projects.reduce(
      (total, project) =>
        total +
        project.environments.length,
      0,
    );

  const totalApiKeys =
    department.projects.reduce(
      (total, project) =>
        total +
        project.environments.reduce(
          (environmentTotal, environment) =>
            environmentTotal +
            environment.apiKeys.length,
          0,
        ),
      0,
    );

  const totalProviderCredentials =
    department.projects.reduce(
      (total, project) =>
        total +
        project.providerCredentials.length +
        project.environments.reduce(
          (environmentTotal, environment) =>
            environmentTotal +
            environment.providerCredentials.length,
          0,
        ),
      0,
    );

  /* =========================================================
     UPDATE DEPARTMENT
  ========================================================= */

  async function handleUpdate() {
    const newName = name.trim();

    if (!newName) {
      setError(
        "Department name is required.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/departments",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: department.id,
            name: newName,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update department.",
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update department.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* =========================================================
     DELETE DEPARTMENT
  ========================================================= */

  async function handleDelete() {
    const confirmed =
      window.confirm(
        `Delete department "${department.name}"?\n\nThis may also remove its projects, environments, API keys, and provider credentials depending on your database foreign-key rules.`,
      );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/departments",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: department.id,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete department.",
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete department.",
      );

      setIsDeleting(false);
    }
  }

  /* =========================================================
     CREATE PROJECT
  ========================================================= */

  async function handleCreateProject() {
    const newProjectName =
      projectName.trim();

    if (!newProjectName) {
      setError(
        "Project name is required.",
      );
      return;
    }

    setIsCreatingProject(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/projects",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            departmentId:
              department.id,
            name: newProjectName,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create project.",
        );
      }

      setProjectName("");
      setShowProjectForm(false);

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create project.",
      );
    } finally {
      setIsCreatingProject(false);
    }
  }

  /* =========================================================
     EDIT MODE
  ========================================================= */

  if (isEditing) {
    return (
      <article
        className="
          rounded-2xl
          border
          border-indigo-200
          bg-white
          p-6
          shadow-sm
        "
      >
        <div className="flex flex-col gap-4">
          <div>
            <p
              className="
                mb-2
                text-[11px]
                font-bold
                uppercase
                tracking-wider
                text-indigo-600
              "
            >
              Department
            </p>

            <input
              value={name}
              onChange={(event) =>
                setName(
                  event.target.value,
                )
              }
              autoFocus
              disabled={isSaving}
              className="
                w-full
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-3
                text-lg
                font-semibold
                text-slate-900
                outline-none
                transition
                focus:border-indigo-400
                focus:ring-4
                focus:ring-indigo-500/10
              "
            />
          </div>

          {error && (
            <div
              className="
                rounded-xl
                border
                border-red-100
                bg-red-50
                px-4
                py-3
                text-sm
                text-red-600
              "
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setName(
                  department.name,
                );
                setError(null);
              }}
              disabled={isSaving}
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                px-4
                py-2.5
                text-sm
                font-semibold
                text-slate-600
                transition
                hover:bg-slate-50
                disabled:opacity-50
              "
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleUpdate}
              disabled={isSaving}
              className="
                rounded-xl
                bg-indigo-600
                px-5
                py-2.5
                text-sm
                font-semibold
                text-white
                transition
                hover:bg-indigo-700
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {isSaving
                ? "Saving..."
                : "Save Changes"}
            </button>
          </div>
        </div>
      </article>
    );
  }

  /* =========================================================
     NORMAL DEPARTMENT CARD
  ========================================================= */

  return (
    <article
      className="
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-white
        shadow-sm
        transition
        duration-200
        hover:-translate-y-0.5
        hover:shadow-lg
      "
    >
      {/* =====================================================
          CARD BODY
      ===================================================== */}

      <div className="p-6">
        {/* Header */}

        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            {/* Department Icon */}

            <div
              className="
                flex
                h-14
                w-14
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-gradient-to-br
                from-blue-50
                to-indigo-50
                text-xl
                font-bold
                text-blue-600
              "
            >
              {department.name
                .charAt(0)
                .toUpperCase()}
            </div>

            {/* Name */}

            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className="
                    rounded-md
                    bg-blue-50
                    px-2.5
                    py-1
                    text-[11px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-blue-600
                  "
                >
                  Department
                </span>

                <span className="text-xs font-medium text-slate-400">
                  {department.id.slice(
                    0,
                    8,
                  )}
                </span>
              </div>

              <h3 className="truncate text-xl font-bold text-slate-950">
                {department.name}
              </h3>
            </div>
          </div>

          {/* Status */}

          <span
            className="
              hidden
              shrink-0
              items-center
              gap-1.5
              rounded-lg
              border
              border-emerald-200
              bg-emerald-50
              px-3
              py-1.5
              text-xs
              font-semibold
              text-emerald-700
              sm:inline-flex
            "
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

            Active
          </span>
        </div>

        {/* Description */}

        <p
          className="
            mt-5
            text-sm
            leading-6
            text-slate-500
          "
        >
          Manage projects, environments,
          API keys, and provider credentials
          within this department.
        </p>

        {/* ===================================================
            METRICS
        =================================================== */}

        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <DepartmentMetric
            label="Projects"
            value={totalProjects}
            icon="◇"
          />

          <DepartmentMetric
            label="Environments"
            value={totalEnvironments}
            icon="▤"
          />

          <DepartmentMetric
            label="API Keys"
            value={totalApiKeys}
            icon="⚿"
          />

          <DepartmentMetric
            label="Providers"
            value={totalProviderCredentials}
            icon="◈"
          />
        </div>

        {/* ===================================================
            FOOTER INFO
        =================================================== */}

        <div
          className="
            mt-5
            flex
            items-center
            justify-between
            border-t
            border-slate-100
            pt-5
          "
        >
          <div>
            <p className="text-xs font-medium text-slate-400">
              Projects
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              {totalProjects}
            </p>
          </div>

          <div className="text-right">
            <p className="text-xs font-medium text-slate-400">
              Resources
            </p>

            <p className="mt-1 text-sm font-semibold text-slate-700">
              {totalEnvironments +
                totalApiKeys +
                totalProviderCredentials}
            </p>
          </div>
        </div>
      </div>

      {/* =====================================================
          CARD ACTIONS
      ===================================================== */}

      <div
        className="
          flex
          flex-col
          gap-3
          border-t
          border-slate-100
          bg-slate-50/60
          p-4
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div className="flex items-center gap-2">
          {/* Edit */}

          <button
            type="button"
            onClick={() => {
              setName(
                department.name,
              );
              setError(null);
              setIsEditing(true);
            }}
            className="
              inline-flex
              items-center
              justify-center
              gap-2
              rounded-xl
              border
              border-slate-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-semibold
              text-slate-700
              shadow-sm
              transition
              hover:border-slate-300
              hover:bg-slate-50
            "
          >
            ✎
            <span>Edit</span>
          </button>

          {/* Delete */}

          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="
              hidden
              rounded-xl
              border
              border-red-200
              bg-white
              px-4
              py-2.5
              text-sm
              font-semibold
              text-red-600
              transition
              hover:bg-red-50
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:inline-flex
            "
          >
            {isDeleting
              ? "Deleting..."
              : "Delete"}
          </button>
        </div>

        {/* View Projects */}

        <button
          type="button"
          onClick={() =>
            setIsExpanded(
              (current) => !current,
            )
          }
          className="
            inline-flex
            items-center
            justify-center
            gap-2
            rounded-xl
            bg-indigo-600
            px-5
            py-2.5
            text-sm
            font-semibold
            text-white
            shadow-sm
            transition
            hover:bg-indigo-700
            hover:shadow-md
          "
        >
          {isExpanded
            ? "Hide Projects"
            : "View Projects"}

          <span
            className={`
              text-base
              transition-transform
              ${
                isExpanded
                  ? "rotate-90"
                  : ""
              }
            `}
          >
            →
          </span>
        </button>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && !isEditing && (
        <div
          className="
            border-t
            border-red-100
            bg-red-50
            px-5
            py-3
            text-sm
            text-red-600
          "
        >
          {error}
        </div>
      )}

      {/* =====================================================
          EXPANDED PROJECT AREA
      ===================================================== */}

      {isExpanded && (
        <div
          className="
            border-t
            border-slate-200
            bg-slate-50
            p-5
          "
        >
          {/* Projects heading */}

          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-bold text-slate-900">
                Projects
              </h4>

              <p className="mt-1 text-xs text-slate-500">
                Projects belonging to this
                department.
              </p>
            </div>

            {!showProjectForm && (
              <button
                type="button"
                onClick={() => {
                  setShowProjectForm(true);
                  setError(null);
                }}
                className="
                  inline-flex
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  py-2
                  text-sm
                  font-semibold
                  text-slate-700
                  shadow-sm
                  transition
                  hover:bg-slate-50
                "
              >
                +
                <span>Add Project</span>
              </button>
            )}
          </div>

          {/* =================================================
              CREATE PROJECT FORM
          ================================================= */}

          {showProjectForm && (
            <div
              className="
                mb-5
                rounded-2xl
                border
                border-indigo-100
                bg-white
                p-5
                shadow-sm
              "
            >
              <div className="flex flex-col gap-4">
                <div>
                  <label
                    htmlFor={`project-${department.id}`}
                    className="
                      mb-2
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    Project name
                  </label>

                  <input
                    id={`project-${department.id}`}
                    type="text"
                    value={projectName}
                    onChange={(event) =>
                      setProjectName(
                        event.target.value,
                      )
                    }
                    disabled={
                      isCreatingProject
                    }
                    autoFocus
                    placeholder="e.g. AI Gateway"
                    className="
                      w-full
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-4
                      py-3
                      text-sm
                      text-slate-900
                      outline-none
                      placeholder:text-slate-400
                      focus:border-indigo-400
                      focus:ring-4
                      focus:ring-indigo-500/10
                    "
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProjectName("");
                      setShowProjectForm(
                        false,
                      );
                      setError(null);
                    }}
                    disabled={
                      isCreatingProject
                    }
                    className="
                      rounded-xl
                      border
                      border-slate-200
                      bg-white
                      px-4
                      py-2.5
                      text-sm
                      font-semibold
                      text-slate-600
                      transition
                      hover:bg-slate-50
                      disabled:opacity-50
                    "
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleCreateProject
                    }
                    disabled={
                      isCreatingProject
                    }
                    className="
                      rounded-xl
                      bg-indigo-600
                      px-5
                      py-2.5
                      text-sm
                      font-semibold
                      text-white
                      transition
                      hover:bg-indigo-700
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    {isCreatingProject
                      ? "Creating..."
                      : "Create Project"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* =================================================
              PROJECT LIST
          ================================================= */}

          {department.projects.length ===
          0 ? (
            <div
              className="
                rounded-2xl
                border
                border-dashed
                border-slate-300
                bg-white
                p-8
                text-center
              "
            >
              <div
                className="
                  mx-auto
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-full
                  bg-indigo-50
                  text-2xl
                  text-indigo-600
                "
              >
                +
              </div>

              <h5 className="mt-4 text-sm font-bold text-slate-900">
                No projects yet
              </h5>

              <p className="mt-1 text-xs text-slate-500">
                Create a project to start
                managing environments.
              </p>

              {!showProjectForm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowProjectForm(
                      true,
                    );
                    setError(null);
                  }}
                  className="
                    mt-4
                    text-sm
                    font-semibold
                    text-indigo-600
                    hover:text-indigo-700
                  "
                >
                  + Create Project
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {department.projects.map(
                (project) => (
                  <ProjectSection
                    key={project.id}
                    project={project}
                  />
                ),
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/* =========================================================
   DEPARTMENT METRIC
========================================================= */

type DepartmentMetricProps = {
  label: string;
  value: number;
  icon: string;
};

function DepartmentMetric({
  label,
  value,
  icon,
}: DepartmentMetricProps) {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-200
        bg-slate-50
        px-4
        py-3
      "
    >
      <div className="flex items-center gap-2">
        <span className="text-sm text-indigo-500">
          {icon}
        </span>

        <p
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-wide
            text-slate-400
          "
        >
          {label}
        </p>
      </div>

      <p className="mt-1 text-xl font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}