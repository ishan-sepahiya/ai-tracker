"use client";

import { useState } from "react";

import type {
  ProviderCredential,
  SafeProviderCredential,
} from "@/lib/api-management/types";

type ProviderCredentialCardProps = {
  credential: SafeProviderCredential;
};

export default function ProviderCredentialCard({
  credential,
}: ProviderCredentialCardProps) {
  const [isEditing, setIsEditing] =
    useState(false);

  const [displayName, setDisplayName] =
    useState(
      credential.display_name ?? "",
    );

  const [secret, setSecret] =
    useState("");

  const [showSecret, setShowSecret] =
    useState(false);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isRevoking, setIsRevoking] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const isActive =
    credential.status.toUpperCase() ===
    "ACTIVE";

  async function handleUpdate() {
    const newName =
      displayName.trim();

    const newSecret =
      secret.trim();

    if (!newName && !newSecret) {
      setError(
        "Enter a display name or a new secret.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const body: {
        id: string;
        displayName?: string;
        secret?: string;
      } = {
        id: credential.id,
      };

      if (newName) {
        body.displayName = newName;
      }

      if (newSecret) {
        body.secret = newSecret;
      }

      const response = await fetch(
        "/api/team/provider-credentials",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(body),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update credential.",
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update credential.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevoke() {
    const confirmed =
      window.confirm(
        `Revoke "${credential.display_name || credential.provider_name}"?`,
      );

    if (!confirmed) {
      return;
    }

    setIsRevoking(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/provider-credentials",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: credential.id,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to revoke credential.",
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to revoke credential.",
      );
    } finally {
      setIsRevoking(false);
    }
  }

  function cancelEdit() {
    setIsEditing(false);
    setDisplayName(
      credential.display_name ?? "",
    );
    setSecret("");
    setShowSecret(false);
    setError(null);
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={displayName}
                onChange={(event) =>
                  setDisplayName(
                    event.target.value,
                  )
                }
                placeholder="Display name"
                disabled={isSaving}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
              />

              <div className="relative">
                <input
                  type={
                    showSecret
                      ? "text"
                      : "password"
                  }
                  value={secret}
                  onChange={(event) =>
                    setSecret(
                      event.target.value,
                    )
                  }
                  placeholder="New secret — leave empty to keep current"
                  disabled={isSaving}
                  autoComplete="new-password"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 pr-16 font-mono text-sm"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowSecret(
                      (value) => !value,
                    )
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500"
                >
                  {showSecret
                    ? "Hide"
                    : "Show"}
                </button>
              </div>

              <p className="text-[11px] text-gray-400">
                A new secret rotates the credential.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={cancelEdit}
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
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-gray-900">
                  {credential.display_name ||
                    credential.provider_name}
                </p>

                <span
                  className={`rounded-full px-2 py-1 text-[10px] ${
                    isActive
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-red-50 text-red-600"
                  }`}
                >
                  {credential.status}
                </span>
              </div>

              <p className="mt-1 text-xs text-gray-400">
                {credential.provider_name}
              </p>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsEditing(true);
                setError(null);
              }}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs"
            >
              Edit
            </button>

            {isActive && (
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isRevoking}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs text-red-600"
              >
                {isRevoking
                  ? "Revoking..."
                  : "Revoke"}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="mt-3 grid gap-2 text-[11px] text-gray-500 sm:grid-cols-2">
        <div>
          <span className="text-gray-400">
            Last rotation
          </span>

          <p>
            {credential.rotated_at
              ? new Date(
                  credential.rotated_at,
                ).toLocaleString()
              : "Never"}
          </p>
        </div>

        <div>
          <span className="text-gray-400">
            Created
          </span>

          <p>
            {credential.created_at
              ? new Date(
                  credential.created_at,
                ).toLocaleDateString()
              : "Unknown"}
          </p>
        </div>
      </div>
    </div>
  );
}