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
  const [isEditing, setIsEditing] =
    useState(false);

  const [name, setName] =
    useState(department.name);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

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
            "Content-Type":
              "application/json",
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

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete department "${department.name}"?`,
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
            "Content-Type":
              "application/json",
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
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="ml-4 border-l border-gray-200 pl-4">
      <div className="mb-3 flex flex-col gap-3 rounded-lg bg-white p-4">
        <div className="flex items-center justify-between">
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
            <h3 className="font-semibold text-gray-900">
              {department.name}
            </h3>
          )}

          <div className="flex gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(
                      department.name,
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
      </div>

      <div className="space-y-3">
        {department.projects.length ? (
          department.projects.map(
            (project) => (
              <ProjectSection
                key={project.id}
                project={project}
              />
            ),
          )
        ) : (
          <p className="text-sm text-gray-500">
            No projects.
          </p>
        )}
      </div>
    </div>
  );
}