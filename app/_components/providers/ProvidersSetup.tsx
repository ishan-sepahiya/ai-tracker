"use client";

import { useEffect, useMemo, useState } from "react";

import type { ProviderListItem } from "@/lib/providers/repository";

type ProviderOption = {
  provider_name: ProviderListItem["provider_name"];
  display: string;
  icon: string;
};

const PROVIDERS: ProviderOption[] = [
  { provider_name: "openai", display: "OpenAI", icon: "O" },
  { provider_name: "bedrock", display: "AWS Bedrock", icon: "B" },
  { provider_name: "vertex", display: "GCP Vertex AI", icon: "V" },
  { provider_name: "anthropic", display: "Anthropic", icon: "A" },
  { provider_name: "other", display: "Other", icon: "•" },
];

function providerIcon(providerName: string) {
  return PROVIDERS.find((p) => p.provider_name === providerName)?.icon ?? "?";
}

export default function ProvidersSetup() {
  const [providers, setProviders] = useState<ProviderListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [addProviderName, setAddProviderName] = useState<string>("openai");
  const [addDisplayName, setAddDisplayName] = useState("");
  const [addApiKey, setAddApiKey] = useState("");
  const [savingProvider, setSavingProvider] = useState(false);

  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const maskedLabel = (last4: string | null) =>
    last4 ? `•••• ${last4}` : "Not set";

  async function fetchProviders() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/providers", { method: "GET" });
      if (!res.ok) {
        throw new Error(`Failed to load providers (${res.status})`);
      }
      const json = (await res.json()) as { providers: ProviderListItem[] };
      setProviders(json.providers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load providers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProviders();
  }, []);

  function openModal() {
    setModalOpen(true);
    setAddProviderName("openai");
    setAddDisplayName("");
    setAddApiKey("");
    setError(null);
  }

  async function onSubmitProvider() {
    setSavingProvider(true);
    setError(null);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          provider_name: addProviderName,
          display_name: addDisplayName.trim() || null,
          apiKey: addApiKey,
        }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Failed to save provider: ${msg || res.status}`);
      }

      setModalOpen(false);
      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save provider");
    } finally {
      setSavingProvider(false);
    }
  }

  async function toggleActive(providerId: string, isActive: boolean) {
    setUpdatingId(providerId);
    setError(null);
    try {
      const res = await fetch(`/api/providers/${providerId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(`Failed to update provider: ${msg || res.status}`);
      }

      await fetchProviders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update provider");
    } finally {
      setUpdatingId(null);
    }
  }

  const providerCount = useMemo(() => providers.length, [providers.length]);

  return (
    <div className="min-h-screen bg-black text-zinc-50 px-6 py-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-zinc-400">Settings</div>
            <div className="text-3xl font-semibold">Providers</div>
            <div className="text-zinc-300 mt-1">
              Manage your connected AI providers ({providerCount})
            </div>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="rounded-xl bg-zinc-50 text-zinc-950 font-medium px-4 py-2 hover:opacity-90"
          >
            Add Provider
          </button>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="text-zinc-400">Loading providers...</div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providers.map((p) => (
            <div
              key={p.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-lg font-semibold">
                    {providerIcon(p.provider_name)}
                  </div>

                  <div>
                    <div className="text-zinc-50 font-semibold">
                      {p.display_name ?? p.provider_name}
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">
                      API key: {maskedLabel(p.api_key_masked_last4)}
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">
                      {p.provider_name}
                    </div>
                  </div>
                </div>

                <label className="flex items-center gap-3 select-none">
                  <span className="text-sm text-zinc-300">Active</span>
                  <input
                    type="checkbox"
                    checked={p.is_active}
                    disabled={updatingId === p.id}
                    onChange={(e) => toggleActive(p.id, e.target.checked)}
                    className="w-5 h-5 accent-zinc-200"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>

        {modalOpen ? (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/70"
              onClick={() => (modalOpen ? setModalOpen(false) : null)}
            />

            <div className="relative mx-auto mt-16 w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-lg font-semibold">Add Provider</div>
                  <div className="text-sm text-zinc-400 mt-1">
                    API keys are stored encrypted.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-zinc-400 hover:text-zinc-50"
                >
                  Close
                </button>
              </div>

              <div className="mt-5 space-y-4">
                <div className="space-y-2">
                  <div className="text-sm text-zinc-300">Provider</div>
                  <select
                    value={addProviderName}
                    onChange={(e) => setAddProviderName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
                  >
                    {PROVIDERS.map((opt) => (
                      <option key={opt.provider_name} value={opt.provider_name}>
                        {opt.display}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-zinc-300">Display name</div>
                  <input
                    value={addDisplayName}
                    onChange={(e) => setAddDisplayName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
                    placeholder="e.g. Production OpenAI"
                  />
                </div>

                <div className="space-y-2">
                  <div className="text-sm text-zinc-300">API key</div>
                  <input
                    type="password"
                    value={addApiKey}
                    onChange={(e) => setAddApiKey(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
                    placeholder="Paste key"
                    required
                  />
                </div>

                <button
                  type="button"
                  disabled={savingProvider}
                  onClick={onSubmitProvider}
                  className="w-full rounded-xl bg-zinc-50 text-zinc-950 font-medium py-3 disabled:opacity-60"
                >
                  {savingProvider ? "Saving..." : "Save Provider"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

