"use client";

import { useState } from "react";

type CreateOrganizationModalProps = {
  onClose: () => void;
};

export default function CreateOrganizationModal({
  onClose,
}: CreateOrganizationModalProps) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    console.log(
      "🟢 CREATE ORGANIZATION: submit triggered",
    );

    const trimmedName = name.trim();

    console.log(
      "🟢 Organization name:",
      trimmedName,
    );

    // ---------------------------------------------------------
    // Validate organization name
    // ---------------------------------------------------------
    if (!trimmedName) {
      console.log(
        "🔴 Validation failed: empty organization name",
      );

      setError("Organization name is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log(
        "🟡 Sending POST request to /api/team/organizations...",
      );

      const response = await fetch(
        "/api/team/organizations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: trimmedName,
          }),
        },
      );

      console.log(
        "🟡 Response received:",
        response.status,
        response.statusText,
      );

      // ---------------------------------------------------------
      // Read response
      // ---------------------------------------------------------
      const result = await response.json();

      console.log(
        "🟡 Response body:",
        result,
      );

      // ---------------------------------------------------------
      // Handle API errors
      // ---------------------------------------------------------
      if (!response.ok) {
        throw new Error(
          result.error ||
            result.details ||
            "Failed to create organization.",
        );
      }

      // ---------------------------------------------------------
      // Organization successfully created
      // ---------------------------------------------------------
      console.log(
        "🟢 Organization created successfully:",
        result.organization,
      );

      // Reload dashboard so the new organization appears
      window.location.reload();
    } catch (err) {
      console.error(
        "🔴 Organization creation error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-xl">
        {/* ---------------------------------------------------
            Header
        --------------------------------------------------- */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink-black">
              Create Organization
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Create a new organization for your team.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ×
          </button>
        </div>

        {/* ---------------------------------------------------
            Form
        --------------------------------------------------- */}
        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >
          {/* Organization Name */}
          <div>
            <label
              htmlFor="organization-name"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              Organization name
            </label>

            <input
              id="organization-name"
              name="organizationName"
              type="text"
              value={name}
              onChange={(event) => {
                setName(event.target.value);

                // Clear previous error while typing
                if (error) {
                  setError("");
                }
              }}
              placeholder="e.g. Acme AI"
              autoFocus
              autoComplete="organization"
              disabled={loading}
              maxLength={100}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition placeholder:text-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-gray-50"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div
              role="alert"
              className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-600"
            >
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3">
            {/* Cancel */}
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>

            {/* Create */}
            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-prussian-blue px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? "Creating..."
                : "Create Organization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}