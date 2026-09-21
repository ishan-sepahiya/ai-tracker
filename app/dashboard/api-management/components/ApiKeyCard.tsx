"use client";

import { useState } from "react";
import type { ApiKey } from "@/lib/api-management/types";

type ApiKeyCardProps = {
  apiKey: ApiKey;
};

export default function ApiKeyCard({
  apiKey,
}: ApiKeyCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(apiKey.name ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRevoked = apiKey.revoked;

  async function handleUpdate() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("API key name is required.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/team/api-keys", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: apiKey.id,
          name: trimmedName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to update API key.",
        );
      }

      setIsEditing(false);
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update API key.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRevoke() {
    const confirmed = window.confirm(
      `Revoke API key "${apiKey.name || "Unnamed Key"}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setIsRevoking(true);
    setError(null);

    try {
      const response = await fetch("/api/team/api-keys", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: apiKey.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to revoke API key.",
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to revoke API key.",
      );
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                autoFocus
                disabled={isSaving}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-gray-500 sm:max-w-xs"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(apiKey.name ?? "");
                    setError(null);
                  }}
                  disabled={isSaving}
                  className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={isSaving}
                  className="rounded-md bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-gray-900">
                  {apiKey.name || "Unnamed API Key"}
                </p>

                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    isRevoked
                      ? "bg-red-50 text-red-600"
                      : "bg-emerald-50 text-emerald-600"
                  }`}
                >
                  {isRevoked ? "Revoked" : "Active"}
                </span>
              </div>

              <p className="mt-1 font-mono text-[11px] text-gray-400">
                ID: {apiKey.id.slice(0, 8)}...
              </p>
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex shrink-0 items-center gap-2">
            {!isRevoked && (
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  setError(null);
                }}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Rename
              </button>
            )}

            {!isRevoked && (
              <button
                type="button"
                onClick={handleRevoke}
                disabled={isRevoking}
                className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {isRevoking ? "Revoking..." : "Revoke"}
              </button>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="mt-3 grid gap-2 text-[11px] text-gray-500 sm:grid-cols-3">
        <div>
          <span className="text-gray-400">Last used</span>
          <p className="mt-0.5 text-gray-600">
            {apiKey.last_used
              ? new Date(apiKey.last_used).toLocaleString()
              : "Never"}
          </p>
        </div>

        <div>
          <span className="text-gray-400">Expires</span>
          <p className="mt-0.5 text-gray-600">
            {apiKey.expires_at
              ? new Date(apiKey.expires_at).toLocaleDateString()
              : "Never"}
          </p>
        </div>

        <div>
          <span className="text-gray-400">Daily budget</span>
          <p className="mt-0.5 text-gray-600">
            {apiKey.daily_budget !== null &&
            apiKey.daily_budget !== undefined
              ? apiKey.daily_budget
              : "No limit"}
          </p>
        </div>
      </div>
    </div>
  );
}