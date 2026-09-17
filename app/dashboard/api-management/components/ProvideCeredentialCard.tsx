import type { ProviderCredential } from "@/lib/api-management/types";

type ProviderCredentialCardProps = {
  credential: ProviderCredential;
};

export default function ProviderCredentialCard({
  credential,
}: ProviderCredentialCardProps) {
  const isActive =
    credential.status.toUpperCase() === "ACTIVE";

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-black">
            {credential.display_name ||
              credential.provider_name}
          </p>

          <p className="mt-0.5 text-[11px] capitalize text-gray-400">
            {credential.provider_name}
          </p>
        </div>

        <span
          className={`rounded-full px-2 py-1 text-[10px] font-medium ${
            isActive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {credential.status}
        </span>
      </div>

      <div className="mt-3 text-[11px] text-gray-400">
        {credential.rotated_at
          ? `Rotated ${new Date(
              credential.rotated_at,
            ).toLocaleDateString()}`
          : "No rotation recorded"}
      </div>
    </div>
  );
}