"use client";

import { useState } from "react";

type CreateProviderCredentialModalProps = {
  projectId: string;
  environmentId?: string | null;
  environmentName?: string;
  projectName: string;
  onClose: () => void;
  onCreated: () => void;
};

const PROVIDERS = [
  "OpenAI",
  "Anthropic",
  "Google",
  "Mistral",
  "Groq",
  "Cohere",
  "Other",
];

export default function CreateProviderCredentialModal({
  projectId,
  environmentId,
  environmentName,
  projectName,
  onClose,
  onCreated,
}: CreateProviderCredentialModalProps) {
  const [providerName, setProviderName] =
    useState("OpenAI");

  const [displayName, setDisplayName] =
    useState("");

  const [secret, setSecret] =
    useState("");

  const [showSecret, setShowSecret] =
    useState(false);

  const [isCreating, setIsCreating] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleCreate() {
    const provider =
      providerName.trim();

    const credentialSecret =
      secret.trim();

    if (!provider) {
      setError("Provider is required.");
      return;
    }

    if (!credentialSecret) {
      setError(
        "Provider API secret is required.",
      );
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/provider-credentials",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            projectId,
            environmentId:
              environmentId ?? null,
            providerName: provider,
            displayName:
              displayName.trim() || null,
            secret: credentialSecret,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to create provider credential.",
        );
      }

      onCreated();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create provider credential.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-5">
          <h2 className="text-lg font-semibold text-gray-900">
            Add Provider Credential
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            {environmentName
              ? `Credential for ${environmentName}`
              : `Project credential for ${projectName}`}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Provider
            </label>

            <select
              value={providerName}
              onChange={(event) =>
                setProviderName(
                  event.target.value,
                )
              }
              disabled={isCreating}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              {PROVIDERS.map(
                (provider) => (
                  <option
                    key={provider}
                    value={provider}
                  >
                    {provider}
                  </option>
                ),
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Display name
            </label>

            <input
              type="text"
              value={displayName}
              onChange={(event) =>
                setDisplayName(
                  event.target.value,
                )
              }
              placeholder="Production OpenAI"
              disabled={isCreating}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              API Secret
            </label>

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
                disabled={isCreating}
                autoComplete="new-password"
                placeholder="Provider API key"
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

            <p className="mt-1 text-xs text-gray-400">
              The secret is never returned to the
              dashboard.
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
            className="rounded-md border border-gray-300 px-4 py-2 text-sm"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="rounded-md bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {isCreating
              ? "Adding..."
              : "Add Credential"}
          </button>
        </div>
      </div>
    </div>
  );
}