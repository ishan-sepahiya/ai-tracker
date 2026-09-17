import type { EnvironmentWithResources } from "@/lib/api-management/service";

import ApiKeyCard from "./ApiKeyCard";
import ProviderCredentialCard from "./ProvideCeredentialCard";

type EnvironmentCardProps = {
  environment: EnvironmentWithResources;
};

type EnvironmentMeta = {
  label: string;
  badgeClass: string;
  icon: string;
};

function getEnvironmentMeta(name: string): EnvironmentMeta {
  const normalized = name.toLowerCase();

  if (
    normalized.includes("prod") ||
    normalized.includes("production")
  ) {
    return {
      label: "PRODUCTION",
      badgeClass:
        "border-red-200 bg-red-50 text-red-700",
      icon: "🔴",
    };
  }

  if (
    normalized.includes("stage") ||
    normalized.includes("staging")
  ) {
    return {
      label: "STAGING",
      badgeClass:
        "border-amber-200 bg-amber-50 text-amber-700",
      icon: "🟡",
    };
  }

  if (
    normalized.includes("dev") ||
    normalized.includes("development")
  ) {
    return {
      label: "DEVELOPMENT",
      badgeClass:
        "border-emerald-200 bg-emerald-50 text-emerald-700",
      icon: "🟢",
    };
  }

  return {
    label: name.toUpperCase(),
    badgeClass:
      "border-blue-200 bg-blue-50 text-blue-700",
    icon: "🔵",
  };
}

export default function EnvironmentCard({
  environment,
}: EnvironmentCardProps) {
  const meta = getEnvironmentMeta(environment.name);

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Environment Header */}
      <div className="border-b border-gray-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-lg">{meta.icon}</div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Environment
              </p>

              <h5 className="mt-1 font-semibold text-ink-black">
                {environment.name}
              </h5>
            </div>
          </div>

          <span
            className={`rounded-full border px-2 py-1 text-[9px] font-bold tracking-wide ${meta.badgeClass}`}
          >
            {meta.label}
          </span>
        </div>

        <div className="mt-3 font-mono text-[10px] text-gray-400">
          {environment.id}
        </div>
      </div>

      {/* Environment Resources */}
      <div className="space-y-5 p-4">
        {/* API Keys */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔑</span>

              <span className="text-xs font-semibold text-gray-700">
                API Keys
              </span>
            </div>

            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
              {environment.apiKeys.length}
            </span>
          </div>

          <div className="space-y-2">
            {environment.apiKeys.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-center">
                <p className="text-[11px] text-gray-400">
                  No API keys
                </p>
              </div>
            ) : (
              environment.apiKeys.map((apiKey) => (
                <ApiKeyCard
                  key={apiKey.id}
                  apiKey={apiKey}
                />
              ))
            )}
          </div>

          <button
            type="button"
            className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
          >
            + Add API Key
          </button>
        </div>

        {/* Provider Credentials */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">🔌</span>

              <span className="text-xs font-semibold text-gray-700">
                Provider Credentials
              </span>
            </div>

            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
              {environment.providerCredentials.length}
            </span>
          </div>

          <div className="space-y-2">
            {environment.providerCredentials.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 px-3 py-3 text-center">
                <p className="text-[11px] text-gray-400">
                  No provider credentials
                </p>
              </div>
            ) : (
              environment.providerCredentials.map(
                (credential) => (
                  <ProviderCredentialCard
                    key={credential.id}
                    credential={credential}
                  />
                ),
              )
            )}
          </div>

          <button
            type="button"
            className="mt-2 w-full rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs font-medium text-gray-500 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
          >
            + Add Provider
          </button>
        </div>
      </div>
    </article>
  );
}