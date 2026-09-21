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
  const [isEditing, setIsEditing] = useState(false);

  const [name, setName] = useState(department.name);

  const [isSaving, setIsSaving] = useState(false);

  const [isDeleting, setIsDeleting] = useState(false);

  const [showProjectForm, setShowProjectForm] = useState(false);

  const [projectName, setProjectName] = useState("");

  const [isCreatingProject, setIsCreatingProject] =
    useState(false);

  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------
  // UPDATE DEPARTMENT
  // ---------------------------------------------------------

  async function handleUpdate() {
    const newName = name.trim();

    if (!newName) {
      setError("Department name is required.");
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

      const data = await response.json();

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

  // ---------------------------------------------------------
  // DELETE DEPARTMENT
  // ---------------------------------------------------------

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete department "${department.name}"?\n\nThis may also remove its projects, environments, API keys, and provider credentials depending on your database foreign-key rules.`,
      )
    ) {
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

      const data = await response.json();

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
    } finally {
      setIsDeleting(false);
    }
  }

  // ---------------------------------------------------------
  // CREATE PROJECT
  // ---------------------------------------------------------

  async function handleCreateProject() {
    const newProjectName = projectName.trim();

    if (!newProjectName) {
      setError("Project name is required.");
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
            departmentId: department.id,
            name: newProjectName,
          }),
        },
      );

      const data = await response.json();

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

  return (
    <div className="ml-4 border-l border-gray-200 pl-4">
      {/* =====================================================
          DEPARTMENT HEADER
          ===================================================== */}

      <div className="mb-3 flex flex-col gap-3 rounded-lg bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          {isEditing ? (
            <input
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              autoFocus
              disabled={isSaving}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-dusk-blue focus:ring-2 focus:ring-dusk-blue/20"
            />
          ) : (
            <div>
              <h3 className="font-semibold text-gray-900">
                {department.name}
              </h3>

              <p className="mt-1 text-xs text-gray-500">
                {department.projects.length}{" "}
                {department.projects.length === 1
                  ? "project"
                  : "projects"}
              </p>
            </div>
          )}

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(department.name);
                    setError(null);
                  }}
                  disabled={isSaving}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isSaving}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                  onClick={() => {
                    setIsEditing(true);
                    setError(null);
                  }}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
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
      </div>

      {/* =====================================================
          PROJECTS HEADER
          ===================================================== */}

      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">
          Projects
        </h4>

        {!showProjectForm && (
          <button
            type="button"
            onClick={() => {
              setShowProjectForm(true);
              setError(null);
            }}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
          >
            + Add Project
          </button>
        )}
      </div>

      {/* =====================================================
          CREATE PROJECT FORM
          ===================================================== */}

      {showProjectForm && (
        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label
                htmlFor={`project-${department.id}`}
                className="mb-1.5 block text-sm font-medium text-gray-700"
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
                disabled={isCreatingProject}
                autoFocus
                placeholder="e.g. AI Gateway"
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-dusk-blue focus:ring-2 focus:ring-dusk-blue/20"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={isCreatingProject}
                className="rounded-md bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingProject
                  ? "Creating..."
                  : "Create"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setProjectName("");
                  setShowProjectForm(false);
                  setError(null);
                }}
                disabled={isCreatingProject}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          PROJECT LIST
          ===================================================== */}

      <div className="space-y-3">
        {department.projects.length > 0 ? (
          department.projects.map(
            (project) => (
              <ProjectSection
                key={project.id}
                project={project}
              />
            ),
          )
        ) : (
          <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
            <p className="text-sm text-gray-500">
              No projects in this department yet.
            </p>

            {!showProjectForm && (
              <button
                type="button"
                onClick={() => {
                  setShowProjectForm(true);
                  setError(null);
                }}
                className="mt-2 text-sm font-medium text-dusk-blue hover:underline"
              >
                + Create your first project
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}