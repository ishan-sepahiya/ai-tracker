"use client";

import { useState } from "react";

import type {
  ProjectWithResources,
} from "@/lib/api-management/service";

import EnvironmentCard from "./EnvironmentCard";
import ProviderCredentialCard from "./ProvideCeredentialCard";
import CreateProviderCredentialModal from "./CreateProviderCredentialModal";

type ProjectSectionProps = {
  project: ProjectWithResources;
};

export default function ProjectSection({
  project,
}: ProjectSectionProps) {
  const [isExpanded, setIsExpanded] =
    useState(false);

  const [isEditing, setIsEditing] =
    useState(false);

  const [name, setName] =
    useState(project.name);

  const [showEnvironmentForm, setShowEnvironmentForm] =
    useState(false);

  const [environmentName, setEnvironmentName] =
    useState("");

  const [showProviderModal, setShowProviderModal] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isCreatingEnvironment, setIsCreatingEnvironment] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  /* =========================================================
     PROJECT METRICS
  ========================================================= */

  const totalEnvironments =
    project.environments.length;

  const totalApiKeys =
    project.environments.reduce(
      (total, environment) =>
        total +
        environment.apiKeys.length,
      0,
    );

  const totalEnvironmentProviders =
    project.environments.reduce(
      (total, environment) =>
        total +
        environment.providerCredentials.length,
      0,
    );

  const totalProviders =
    project.providerCredentials.length +
    totalEnvironmentProviders;

  const totalResources =
    totalEnvironments +
    totalApiKeys +
    totalProviders;

  /* =========================================================
     UPDATE PROJECT
  ========================================================= */

  async function handleUpdate() {
    const newName = name.trim();

    if (!newName) {
      setError(
        "Project name is required.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/projects",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: project.id,
            name: newName,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update project.",
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update project.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  /* =========================================================
     DELETE PROJECT
  ========================================================= */

  async function handleDelete() {
    const confirmed =
      window.confirm(
        `Delete project "${project.name}"?\n\nThis may also remove its environments, API keys, and provider credentials depending on your database foreign-key rules.`,
      );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/projects",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: project.id,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete project.",
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete project.",
      );

      setIsDeleting(false);
    }
  }

  /* =========================================================
     CREATE ENVIRONMENT
  ========================================================= */

  async function handleCreateEnvironment() {
    const newEnvironmentName =
      environmentName.trim();

    if (!newEnvironmentName) {
      setError(
        "Environment name is required.",
      );
      return;
    }

    setIsCreatingEnvironment(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/environments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectId: project.id,
            name: newEnvironmentName,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create environment.",
        );
      }

      setEnvironmentName("");
      setShowEnvironmentForm(false);

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create environment.",
      );
    } finally {
      setIsCreatingEnvironment(false);
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
              Project
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
                  project.name,
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
     PROJECT CARD
  ========================================================= */

  return (
    <>
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
        {/* ===================================================
            CARD BODY
        =================================================== */}

        <div className="p-6">
          {/* Header */}

          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              {/* Project Icon */}

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
                  from-purple-50
                  to-indigo-50
                  text-xl
                  font-bold
                  text-purple-600
                "
              >
                ◇
              </div>

              {/* Project Name */}

              <div className="min-w-0">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span
                    className="
                      rounded-md
                      bg-purple-50
                      px-2.5
                      py-1
                      text-[11px]
                      font-bold
                      uppercase
                      tracking-wide
                      text-purple-600
                    "
                  >
                    Project
                  </span>

                  <span className="text-xs font-medium text-slate-400">
                    {project.id.slice(
                      0,
                      8,
                    )}
                  </span>
                </div>

                <h4 className="truncate text-xl font-bold text-slate-950">
                  {project.name}
                </h4>
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
            Manage environments, API keys,
            and AI provider credentials for
            this project.
          </p>

          {/* =================================================
              METRICS
          ================================================= */}

          <div className="mt-6 grid grid-cols-3 gap-3">
            <ProjectMetric
              label="Environments"
              value={totalEnvironments}
              icon="▤"
            />

            <ProjectMetric
              label="API Keys"
              value={totalApiKeys}
              icon="⚿"
            />

            <ProjectMetric
              label="Providers"
              value={totalProviders}
              icon="◈"
            />
          </div>

          {/* =================================================
              FOOTER INFO
          ================================================= */}

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
                Resources
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-700">
                {totalResources}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs font-medium text-slate-400">
                Project Providers
              </p>

              <p className="mt-1 text-sm font-semibold text-slate-700">
                {project.providerCredentials.length}
              </p>
            </div>
          </div>
        </div>

        {/* ===================================================
            ACTION BAR
        =================================================== */}

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
                  project.name,
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

          {/* View Environments */}

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
              ? "Hide Environments"
              : "View Environments"}

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

        {/* ===================================================
            ERROR
        =================================================== */}

        {error && (
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

        {/* ===================================================
            EXPANDED PROJECT CONTENT
        =================================================== */}

        {isExpanded && (
          <div
            className="
              border-t
              border-slate-200
              bg-slate-50
              p-5
            "
          >
            {/* =================================================
                PROJECT PROVIDERS
            ================================================= */}

            <section
              className="
                mb-5
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-5
                shadow-sm
              "
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-lg
                        bg-purple-50
                        text-purple-600
                      "
                    >
                      ◈
                    </div>

                    <h5 className="font-bold text-slate-900">
                      Provider Credentials
                    </h5>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Credentials shared across
                    environments in this project.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setShowProviderModal(
                      true,
                    )
                  }
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
                  <span>
                    Add Provider
                  </span>
                </button>
              </div>

              {project.providerCredentials
                .length > 0 ? (
                <div className="mt-4 space-y-3">
                  {project.providerCredentials.map(
                    (credential) => (
                      <ProviderCredentialCard
                        key={credential.id}
                        credential={
                          credential
                        }
                      />
                    ),
                  )}
                </div>
              ) : (
                <div
                  className="
                    mt-4
                    rounded-xl
                    border
                    border-dashed
                    border-slate-300
                    bg-slate-50
                    p-6
                    text-center
                  "
                >
                  <p className="text-sm font-medium text-slate-600">
                    No project-level
                    credentials
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Add a provider credential
                    shared across environments.
                  </p>
                </div>
              )}
            </section>

            {/* =================================================
                ENVIRONMENTS
            ================================================= */}

            <section
              className="
                rounded-2xl
                border
                border-slate-200
                bg-white
                p-5
                shadow-sm
              "
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <div
                      className="
                        flex
                        h-9
                        w-9
                        items-center
                        justify-center
                        rounded-lg
                        bg-blue-50
                        text-blue-600
                      "
                    >
                      ▤
                    </div>

                    <h5 className="font-bold text-slate-900">
                      Environments
                    </h5>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Development, staging, production,
                    and other deployment environments.
                  </p>
                </div>

                {!showEnvironmentForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowEnvironmentForm(
                        true,
                      );
                      setError(null);
                    }}
                    className="
                      inline-flex
                      items-center
                      justify-center
                      gap-2
                      rounded-xl
                      bg-indigo-600
                      px-4
                      py-2
                      text-sm
                      font-semibold
                      text-white
                      shadow-sm
                      transition
                      hover:bg-indigo-700
                    "
                  >
                    +
                    <span>
                      Add Environment
                    </span>
                  </button>
                )}
              </div>

              {/* Create Environment */}

              {showEnvironmentForm && (
                <div
                  className="
                    mt-5
                    rounded-2xl
                    border
                    border-indigo-100
                    bg-indigo-50/40
                    p-5
                  "
                >
                  <label
                    htmlFor={`environment-${project.id}`}
                    className="
                      mb-2
                      block
                      text-sm
                      font-semibold
                      text-slate-700
                    "
                  >
                    Environment name
                  </label>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <input
                      id={`environment-${project.id}`}
                      value={
                        environmentName
                      }
                      onChange={(event) =>
                        setEnvironmentName(
                          event.target.value,
                        )
                      }
                      placeholder="e.g. Production"
                      disabled={
                        isCreatingEnvironment
                      }
                      autoFocus
                      className="
                        h-11
                        flex-1
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-4
                        text-sm
                        text-slate-900
                        outline-none
                        placeholder:text-slate-400
                        focus:border-indigo-400
                        focus:ring-4
                        focus:ring-indigo-500/10
                      "
                    />

                    <button
                      type="button"
                      onClick={
                        handleCreateEnvironment
                      }
                      disabled={
                        isCreatingEnvironment
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
                      {isCreatingEnvironment
                        ? "Creating..."
                        : "Create Environment"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEnvironmentName(
                          "",
                        );
                        setShowEnvironmentForm(
                          false,
                        );
                        setError(null);
                      }}
                      disabled={
                        isCreatingEnvironment
                      }
                      className="
                        rounded-xl
                        border
                        border-slate-200
                        bg-white
                        px-5
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
                  </div>
                </div>
              )}

              {/* Environment List */}

              {project.environments.length >
              0 ? (
                <div className="mt-5 space-y-4">
                  {project.environments.map(
                    (environment) => (
                      <EnvironmentCard
                        key={
                          environment.id
                        }
                        environment={
                          environment
                        }
                        projectId={
                          project.id
                        }
                        projectName={
                          project.name
                        }
                      />
                    ),
                  )}
                </div>
              ) : (
                <div
                  className="
                    mt-5
                    rounded-2xl
                    border
                    border-dashed
                    border-slate-300
                    bg-slate-50
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

                  <p className="mt-4 text-sm font-bold text-slate-800">
                    No environments yet
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Create an environment to
                    start configuring API access.
                  </p>

                  {!showEnvironmentForm && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowEnvironmentForm(
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
                      + Create Environment
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}
      </article>

      {/* =====================================================
          PROVIDER MODAL
      ===================================================== */}

      {showProviderModal && (
        <CreateProviderCredentialModal
          projectId={project.id}
          projectName={project.name}
          onClose={() =>
            setShowProviderModal(false)
          }
          onCreated={() => {
            setShowProviderModal(false);
            window.location.reload();
          }}
        />
      )}
    </>
  );
}

/* =========================================================
   PROJECT METRIC
========================================================= */

type ProjectMetricProps = {
  label: string;
  value: number;
  icon: string;
};

function ProjectMetric({
  label,
  value,
  icon,
}: ProjectMetricProps) {
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