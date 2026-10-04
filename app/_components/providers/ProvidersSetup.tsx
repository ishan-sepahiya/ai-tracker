"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { ProviderListItem } from "@/lib/providers/repository";

type ProviderOption = {
  provider_name: string;
  display: string;
  icon: string;
};

const PROVIDERS: ProviderOption[] = [
  {
    provider_name: "openai",
    display: "OpenAI",
    icon: "O",
  },
  {
    provider_name: "anthropic",
    display: "Anthropic",
    icon: "A",
  },
  {
    provider_name: "bedrock",
    display: "AWS Bedrock",
    icon: "B",
  },
  {
    provider_name: "vertex",
    display: "GCP Vertex AI",
    icon: "V",
  },
  {
    provider_name: "other",
    display: "Other",
    icon: "•",
  },
];

function providerIcon(
  providerName: string
) {
  return (
    PROVIDERS.find(
      (provider) =>
        provider.provider_name ===
        providerName
    )?.icon ?? "?"
  );
}

type ApiError = {
  error?: string;
  details?: string;
};

export default function ProvidersSetup() {
  const [providers, setProviders] =
    useState<ProviderListItem[]>(
      []
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(
      null
    );

  const [modalOpen, setModalOpen] =
    useState(false);

  const [
    addProviderName,
    setAddProviderName,
  ] = useState("openai");

  const [
    addDisplayName,
    setAddDisplayName,
  ] = useState("");

  const [
    addModelName,
    setAddModelName,
  ] = useState("");

  const [
    savingProvider,
    setSavingProvider,
  ] = useState(false);

  const [
    updatingId,
    setUpdatingId,
  ] = useState<string | null>(
    null
  );

  // ==========================================================
  // LOAD PROVIDERS
  // ==========================================================

  async function fetchProviders() {
    setLoading(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/providers",
          {
            method: "GET",
            credentials:
              "same-origin",
            headers: {
              Accept:
                "application/json",
            },
          }
        );

      const json =
        (await response
          .json()
          .catch(
            () => null
          )) as
          | {
              providers?: ProviderListItem[];
            }
          | ApiError
          | null;

      if (!response.ok) {
        const message =
          json &&
          "error" in json
            ? json.error
            : `Failed to load providers (${response.status})`;

        const details =
          json &&
          "details" in json
            ? json.details
            : null;

        throw new Error(
          details
            ? `${message}: ${details}`
            : message
        );
      }

      const result =
        json as {
          providers?: ProviderListItem[];
        };

      setProviders(
        result.providers ?? []
      );
    } catch (err) {
      console.error(
        "Failed to load providers:",
        err
      );

      setProviders([]);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load providers."
      );
    } finally {
      setLoading(false);
    }
  }

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    fetchProviders();
  }, []);

  // ==========================================================
  // OPEN MODAL
  // ==========================================================

  function openModal() {
    setModalOpen(true);
    setAddProviderName(
      "openai"
    );
    setAddDisplayName("");
    setAddModelName("");
    setError(null);
  }

  // ==========================================================
  // SAVE PROVIDER
  // ==========================================================

  async function onSubmitProvider() {
    setSavingProvider(true);
    setError(null);

    try {
      const response =
        await fetch(
          "/api/providers",
          {
            method: "POST",
            credentials:
              "same-origin",
            headers: {
              "content-type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              provider_name:
                addProviderName,
              display_name:
                addDisplayName.trim() ||
                null,
              model_name:
                addModelName.trim() ||
                null,
            }),
          }
        );

      const json =
        (await response
          .json()
          .catch(
            () => null
          )) as ApiError | null;

      if (!response.ok) {
        const message =
          json?.error ||
          `Failed to save provider (${response.status})`;

        const details =
          json?.details;

        throw new Error(
          details
            ? `${message}: ${details}`
            : message
        );
      }

      setModalOpen(false);
      setAddDisplayName("");
      setAddModelName("");

      await fetchProviders();
    } catch (err) {
      console.error(
        "Failed to save provider:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to save provider."
      );
    } finally {
      setSavingProvider(false);
    }
  }

  // ==========================================================
  // TOGGLE ACTIVE
  // ==========================================================

  async function toggleActive(
    providerId: string,
    isActive: boolean
  ) {
    setUpdatingId(providerId);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/providers/${providerId}`,
          {
            method: "PATCH",
            credentials:
              "same-origin",
            headers: {
              "content-type":
                "application/json",
              Accept:
                "application/json",
            },
            body: JSON.stringify({
              is_active:
                isActive,
            }),
          }
        );

      const json =
        (await response
          .json()
          .catch(
            () => null
          )) as ApiError | null;

      if (!response.ok) {
        const message =
          json?.error ||
          `Failed to update provider (${response.status})`;

        const details =
          json?.details;

        throw new Error(
          details
            ? `${message}: ${details}`
            : message
        );
      }

      await fetchProviders();
    } catch (err) {
      console.error(
        "Failed to update provider:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to update provider."
      );
    } finally {
      setUpdatingId(null);
    }
  }

  const providerCount =
    useMemo(
      () => providers.length,
      [providers.length]
    );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-black px-6 py-10 text-zinc-50">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        {/* HEADER */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-zinc-400">
              Settings
            </div>

            <div className="text-3xl font-semibold">
              Providers
            </div>

            <div className="mt-1 text-zinc-300">
              Manage your connected AI
              providers (
              {providerCount})
            </div>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="rounded-xl bg-zinc-50 px-4 py-2 font-medium text-zinc-950 hover:opacity-90"
          >
            Add Provider
          </button>
        </div>

        {/* ERROR */}
        {error ? (
          <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            <div className="font-medium">
              Provider error
            </div>

            <div className="mt-1 break-words">
              {error}
            </div>
          </div>
        ) : null}

        {/* LOADING */}
        {loading ? (
          <div className="text-zinc-400">
            Loading providers...
          </div>
        ) : null}

        {/* PROVIDERS */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {providers.map(
            (provider) => (
              <div
                key={provider.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-lg font-semibold">
                      {providerIcon(
                        provider.provider_name
                      )}
                    </div>

                    <div>
                      <div className="font-semibold text-zinc-50">
                        {provider.display_name ??
                          provider.provider_name}
                      </div>

                      <div className="mt-1 text-sm text-zinc-400">
                        {provider.model_name
                          ? `Model: ${provider.model_name}`
                          : "Provider configured"}
                      </div>

                      <div className="mt-1 text-xs text-zinc-500">
                        {provider.provider_name}
                      </div>

                      <div className="mt-1 text-xs text-zinc-500">
                        API credentials are managed
                        through API Management.
                      </div>
                    </div>
                  </div>

                  <label className="flex select-none items-center gap-3">
                    <span className="text-sm text-zinc-300">
                      Active
                    </span>

                    <input
                      type="checkbox"
                      checked={
                        provider.is_active
                      }
                      disabled={
                        updatingId ===
                        provider.id
                      }
                      onChange={(
                        event
                      ) =>
                        toggleActive(
                          provider.id,
                          event.target
                            .checked
                        )
                      }
                      className="h-5 w-5 accent-zinc-200"
                    />
                  </label>
                </div>
              </div>
            )
          )}
        </div>

        {/* EMPTY STATE */}
        {!loading &&
        providers.length === 0 &&
        !error ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-5 py-10 text-center">
            <div className="text-lg font-medium text-zinc-100">
              No providers connected
            </div>

            <div className="mt-2 text-sm text-zinc-400">
              Add a provider to create its
              provider profile. API credentials
              are managed separately in API
              Management.
            </div>
          </div>
        ) : null}

        {/* ADD PROVIDER MODAL */}
        {modalOpen ? (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() =>
                !savingProvider &&
                setModalOpen(false)
              }
            />

            <div className="relative mx-auto mt-16 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">
                    Add Provider
                  </div>

                  <div className="mt-1 text-sm text-zinc-400">
                    Provider credentials are
                    managed separately in API
                    Management.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    savingProvider
                  }
                  onClick={() =>
                    setModalOpen(false)
                  }
                  className="text-zinc-400 hover:text-zinc-50 disabled:opacity-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 space-y-4">
                {/* PROVIDER */}
                <div className="space-y-2">
                  <div className="text-sm text-zinc-300">
                    Provider
                  </div>

                  <select
                    value={
                      addProviderName
                    }
                    onChange={(
                      event
                    ) =>
                      setAddProviderName(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
                  >
                    {PROVIDERS.map(
                      (option) => (
                        <option
                          key={
                            option.provider_name
                          }
                          value={
                            option.provider_name
                          }
                        >
                          {
                            option.display
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>

                {/* DISPLAY NAME */}
                <div className="space-y-2">
                  <div className="text-sm text-zinc-300">
                    Display name
                  </div>

                  <input
                    value={
                      addDisplayName
                    }
                    onChange={(
                      event
                    ) =>
                      setAddDisplayName(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
                    placeholder="e.g. Production OpenAI"
                  />
                </div>

                {/* MODEL */}
                <div className="space-y-2">
                  <div className="text-sm text-zinc-300">
                    Model name
                  </div>

                  <input
                    value={
                      addModelName
                    }
                    onChange={(
                      event
                    ) =>
                      setAddModelName(
                        event.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
                    placeholder="e.g. gpt-4o"
                  />
                </div>

                {/* SAVE */}
                <button
                  type="button"
                  disabled={
                    savingProvider
                  }
                  onClick={
                    onSubmitProvider
                  }
                  className="w-full rounded-xl bg-zinc-50 py-3 font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingProvider
                    ? "Saving..."
                    : "Save Provider"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}