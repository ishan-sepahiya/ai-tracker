import type { ApiKey } from "@/lib/api-management/types";

type ApiKeyCardProps = {
  apiKey: ApiKey;
};

export default function ApiKeyCard({
  apiKey,
}: ApiKeyCardProps) {
  const status = apiKey.revoked ? "Revoked" : "Active";

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-black">
            {apiKey.name || "Unnamed API key"}
          </p>

          <p className="mt-0.5 text-[11px] text-gray-400">
            ID: {apiKey.id.slice(0, 8)}…
          </p>
        </div>

        <span
          className={`rounded-full px-2 py-1 text-[10px] font-medium ${
            apiKey.revoked
              ? "bg-red-50 text-red-600"
              : "bg-emerald-50 text-emerald-600"
          }`}
        >
          {status}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-gray-400">
        <span>
          {apiKey.last_used
            ? `Used ${new Date(apiKey.last_used).toLocaleDateString()}`
            : "Never used"}
        </span>

        {apiKey.expires_at && (
          <span>
            Expires{" "}
            {new Date(apiKey.expires_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}