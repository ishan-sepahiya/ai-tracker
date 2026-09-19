"use client";

import { useState } from "react";

type CreateApiKeyModalProps = {
  environmentId: string;
  environmentName: string;
  onClose: () => void;
  onCreated: () => void;
};

export default function CreateApiKeyModal({
  environmentId,
  environmentName,
  onClose,
  onCreated,
}: CreateApiKeyModalProps) {
  const [name, setName] = useState("");
  const [dailyBudget, setDailyBudget] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdKey, setCreatedKey] = useState<string | null>(null);

  async function handleCreate() {
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("API key name is required.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch("/api/team/api-keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          environmentId,
          name: trimmedName,
          dailyBudget: dailyBudget
            ? Number(dailyBudget)
            : null,
          expiresAt: expiresAt || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to create API key.",
        );
      }

      setCreatedKey(data.key);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create API key.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopy() {
    if (!createdKey) {
      return;
    }

    try {
      await navigator.clipboard.writeText(createdKey);
    } catch {
      setError(
        "Could not copy the API key. Please copy it manually.",
      );
    }
  }

  function handleDone() {
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        {createdKey ? (
          <>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                API Key Created
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Save this key now. It will not be shown again.
              </p>
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <p className="mb-2 text-xs font-medium text-amber-800">
                Your API key
              </p>

              <div className="break-all rounded-md bg-white p-3 font-mono text-xs text-gray-800">
                {createdKey}
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="mt-3 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Copy API Key
              </button>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={handleDone}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Create API Key
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Create a key for{" "}
                <span className="font-medium text-gray-700">
                  {environmentName}
                </span>
                .
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Key name
                </label>

                <input
                  type="text"
                  value={name}
                  onChange={(event) =>
                    setName(event.target.value)
                  }
                  placeholder="e.g. Backend Production Key"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  disabled={isCreating}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Daily budget
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={dailyBudget}
                  onChange={(event) =>
                    setDailyBudget(event.target.value)
                  }
                  placeholder="Optional"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  disabled={isCreating}
                />

                <p className="mt-1 text-xs text-gray-400">
                  Leave empty for no key-level budget.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Expiration date
                </label>

                <input
                  type="date"
                  value={expiresAt}
                  onChange={(event) =>
                    setExpiresAt(event.target.value)
                  }
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                  disabled={isCreating}
                />

                <p className="mt-1 text-xs text-gray-400">
                  Optional.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isCreating ? "Creating..." : "Create API Key"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}