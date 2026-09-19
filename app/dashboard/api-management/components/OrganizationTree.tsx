"use client";

import { useState } from "react";

import type { OrganizationTree as OrganizationTreeType } from "@/lib/api-management/service";

import DepartmentSection from "./DepartmentSection";

type OrganizationTreeProps = {
  organizations: OrganizationTreeType[];
};

export default function OrganizationTree({
  organizations,
}: OrganizationTreeProps) {
  if (organizations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <h2 className="text-lg font-semibold text-ink-black">
          No organizations yet
        </h2>

        <p className="mt-2 text-sm text-gray-500">
          Create your first organization to start
          managing departments, projects, environments,
          and API credentials.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {organizations.map((organization) => (
        <OrganizationCard
          key={organization.id}
          organization={organization}
        />
      ))}
    </div>
  );
}

type OrganizationCardProps = {
  organization: OrganizationTreeType;
};

function OrganizationCard({
  organization,
}: OrganizationCardProps) {
  const [showDepartmentForm, setShowDepartmentForm] =
    useState(false);

  const [departmentName, setDepartmentName] =
    useState("");

  const [isCreating, setIsCreating] = useState(false);

  const [error, setError] = useState<string | null>(
    null,
  );

  async function handleCreateDepartment() {
    const name = departmentName.trim();

    if (!name) {
      setError("Department name is required.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/departments",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            organizationId: organization.id,
            name,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to create department.",
        );
      }

      setDepartmentName("");
      setShowDepartmentForm(false);

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create department.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Organization Header */}
      <div className="flex flex-col gap-4 border-b border-gray-200 bg-gray-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-prussian-blue text-white">
              <span className="text-lg font-semibold">
                {organization.name
                  .charAt(0)
                  .toUpperCase()}
              </span>
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-ink-black">
                {organization.name}
              </h2>

              <p className="mt-0.5 text-xs text-gray-500">
                {organization.departments.length}{" "}
                {organization.departments.length === 1
                  ? "department"
                  : "departments"}
              </p>
            </div>
          </div>
        </div>

        <OrganizationActions
          organization={organization}
        />
      </div>

      {/* Organization Content */}
      <div className="space-y-4 p-5">
        {organization.departments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm text-gray-500">
              No departments in this organization yet.
            </p>

            {!showDepartmentForm && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setShowDepartmentForm(true);
                }}
                className="mt-3 text-sm font-medium text-dusk-blue hover:underline"
              >
                + Add Department
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-gray-700">
                Departments
              </h3>

              {!showDepartmentForm && (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setShowDepartmentForm(true);
                  }}
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                >
                  + Department
                </button>
              )}
            </div>

            <div className="space-y-4">
              {organization.departments.map(
                (department) => (
                  <DepartmentSection
                    key={department.id}
                    department={department}
                  />
                ),
              )}
            </div>
          </>
        )}

        {/* Create Department Form */}
        {showDepartmentForm && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
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
                  onChange={(event) => {
                    setDepartmentName(
                      event.target.value,
                    );
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
                  {isCreating
                    ? "Creating..."
                    : "Create"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDepartmentName("");
                    setError(null);
                    setShowDepartmentForm(false);
                  }}
                  disabled={isCreating}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

type OrganizationActionsProps = {
  organization: OrganizationTreeType;
};

function OrganizationActions({
  organization,
}: OrganizationActionsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(
    organization.name,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(
    null,
  );

  async function handleUpdate() {
    const name = editName.trim();

    if (!name) {
      setError("Organization name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/organizations",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: organization.id,
            name,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to update organization.",
        );
      }

      setIsEditing(false);

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update organization.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${organization.name}"?\n\nThis may also remove its associated departments, projects, environments, API keys, and provider credentials.`,
    );

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/organizations",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: organization.id,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Failed to delete organization.",
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete organization.",
      );

      setIsDeleting(false);
    }
  }

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={editName}
          onChange={(event) => {
            setEditName(event.target.value);
          }}
          disabled={isSaving}
          autoFocus
          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-ink-black outline-none focus:border-dusk-blue focus:ring-2 focus:ring-dusk-blue/20 sm:w-64"
        />

        <button
          type="button"
          onClick={handleUpdate}
          disabled={isSaving}
          className="rounded-lg bg-prussian-blue px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={() => {
            setEditName(organization.name);
            setIsEditing(false);
            setError(null);
          }}
          disabled={isSaving}
          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          setEditName(organization.name);
          setError(null);
          setIsEditing(true);
        }}
        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
      >
        Edit
      </button>

      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </button>
    </div>
  );
}