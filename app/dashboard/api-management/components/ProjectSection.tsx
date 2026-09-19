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

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete project "${project.name}"?`,
      )
    ) {
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
    } finally {
      setIsDeleting(false);
    }
  }

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

  return (
    <div className="ml-4 border-l border-gray-200 pl-4">
      <div className="flex flex-col gap-3 rounded-lg bg-gray-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {isEditing ? (
              <input
                value={name}
                onChange={(event) =>
                  setName(
                    event.target.value,
                  )
                }
                autoFocus
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
              />
            ) : (
              <h4 className="font-semibold text-gray-900">
                {project.name}
              </h4>
            )}
          </div>

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(
                      project.name,
                    );
                  }}
                  disabled={isSaving}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isSaving}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white"
                >
                  {isSaving
                    ? "Saving..."
                    : "Save"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setIsEditing(true)
                  }
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600"
                >
                  {isDeleting
                    ? "Deleting..."
                    : "Delete"}
                </button>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* Project-level provider credentials */}
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h5 className="font-medium text-gray-900">
                Project Provider Credentials
              </h5>

              <p className="text-xs text-gray-500">
                Credentials shared across environments.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowProviderModal(true)
              }
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs"
            >
              + Add Provider
            </button>
          </div>

          {project.providerCredentials.length ? (
            <div className="space-y-2">
              {project.providerCredentials.map(
                (credential) => (
                  <ProviderCredentialCard
                    key={credential.id}
                    credential={credential}
                  />
                ),
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No project-level credentials.
            </p>
          )}
        </div>

        {/* Environments */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-sm font-medium text-gray-800">
              Environments
            </h5>

            <button
              type="button"
              onClick={() => {
                setShowEnvironmentForm(
                  (value) => !value,
                );
                setError(null);
              }}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs"
            >
              + Environment
            </button>
          </div>

          {showEnvironmentForm && (
            <div className="flex gap-2">
              <input
                value={environmentName}
                onChange={(event) =>
                  setEnvironmentName(
                    event.target.value,
                  )
                }
                placeholder="Environment name"
                disabled={
                  isCreatingEnvironment
                }
                className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
              />

              <button
                type="button"
                onClick={
                  handleCreateEnvironment
                }
                disabled={
                  isCreatingEnvironment
                }
                className="rounded-md bg-gray-900 px-3 py-2 text-xs text-white"
              >
                {isCreatingEnvironment
                  ? "Creating..."
                  : "Create"}
              </button>
            </div>
          )}

          {project.environments.length ? (
            project.environments.map(
              (environment) => (
                <EnvironmentCard
                  key={environment.id}
                  environment={environment}
                  projectId={project.id}
                  projectName={project.name}
                />
              ),
            )
          ) : (
            <p className="text-sm text-gray-500">
              No environments.
            </p>
          )}
        </div>
      </div>

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
    </div>
  );
}