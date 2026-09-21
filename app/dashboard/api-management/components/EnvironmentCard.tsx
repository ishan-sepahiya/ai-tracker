"use client";

import { useState } from "react";

import type { EnvironmentWithResources } from "@/lib/api-management/service";

import ApiKeyCard from "./ApiKeyCard";
import ProviderCredentialCard from "./ProvideCeredentialCard";

import CreateApiKeyModal from "./CreateApiKeyModal";
import CreateProviderCredentialModal from "./CreateProviderCredentialModal";

type EnvironmentCardProps = {
  environment: EnvironmentWithResources;
  projectId: string;
  projectName: string;
};

export default function EnvironmentCard({
  environment,
  projectId,
  projectName,
}: EnvironmentCardProps) {
  const [isEditing, setIsEditing] =
    useState(false);

  const [name, setName] =
    useState(environment.name);

  const [isSaving, setIsSaving] =
    useState(false);

  const [isDeleting, setIsDeleting] =
    useState(false);

  const [showApiKeyModal, setShowApiKeyModal] =
    useState(false);

  const [showProviderModal, setShowProviderModal] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function handleUpdate() {
    const newName = name.trim();

    if (!newName) {
      setError(
        "Environment name is required.",
      );
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/environments",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: environment.id,
            name: newName,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to update environment.",
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update environment.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Delete environment "${environment.name}"?`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/team/environments",
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            id: environment.id,
          }),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete environment.",
        );
      }

      window.location.reload();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete environment.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-sm font-semibold text-gray-700">
                {environment.name
                  .charAt(0)
                  .toUpperCase()}
              </div>

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
                  <>
                    <h4 className="font-semibold text-gray-900">
                      {environment.name}
                    </h4>

                    <p className="text-xs text-gray-500">
                      {environment.id.slice(
                        0,
                        8,
                      )}
                      ...
                    </p>
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditing(false);
                      setName(
                        environment.name,
                      );
                    }}
                    disabled={isSaving}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={isSaving}
                    className="rounded-md bg-gray-900 px-3 py-1.5 text-sm text-white"
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
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600"
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
            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* API Keys */}
          <section className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">
                  API Keys
                </h5>

                <p className="text-xs text-gray-500">
                  Keys assigned to this environment.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowApiKeyModal(true)
                }
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs"
              >
                + Add API Key
              </button>
            </div>

            {environment.apiKeys.length ? (
              <div className="space-y-2">
                {environment.apiKeys.map(
                  (key) => (
                    <ApiKeyCard
                      key={key.id}
                      apiKey={key}
                    />
                  ),
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                No API keys.
              </p>
            )}
          </section>

          {/* Provider credentials */}
          <section className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h5 className="font-medium text-gray-900">
                  Provider Credentials
                </h5>

                <p className="text-xs text-gray-500">
                  Credentials assigned to this environment.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowProviderModal(true)
                }
                className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs"
              >
                + Add Provider
              </button>
            </div>

            {environment.providerCredentials
              .length ? (
              <div className="space-y-2">
                {environment.providerCredentials.map(
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
                No provider credentials.
              </p>
            )}
          </section>
        </div>
      </div>

      {showApiKeyModal && (
        <CreateApiKeyModal
          environmentId={environment.id}
          environmentName={environment.name}
          onClose={() =>
            setShowApiKeyModal(false)
          }
          onCreated={() => {
            setShowApiKeyModal(false);
            window.location.reload();
          }}
        />
      )}

      {showProviderModal && (
        <CreateProviderCredentialModal
          projectId={projectId}
          projectName={projectName}
          environmentId={environment.id}
          environmentName={environment.name}
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