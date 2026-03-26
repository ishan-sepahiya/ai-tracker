"use client";

import { useState } from "react";

import { setApiToken } from "@/lib/actions/settings";

export default function ApiTokenClient(props: { last8: string }) {
  const [last8, setLast8State] = useState(props.last8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onGenerate() {
    setError(null);
    setOk(null);
    setLoading(true);
    try {
      const newToken = crypto.randomUUID();
      await setApiToken(newToken);
      setLast8State(newToken.slice(-8));
      setOk("New token generated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate token");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/30 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
      {ok ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 text-sm text-zinc-100">
          {ok}
        </div>
      ) : null}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="text-lg font-semibold">SDK Token</div>
        <div className="mt-1 text-sm text-zinc-400">
          Used for machine-to-machine ingestion at <code className="text-zinc-200">/api/sdk/usage</code>.
        </div>

        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-sm text-zinc-300">Current token</div>
              <div className="font-mono text-zinc-50 text-sm">
                •••••••• {last8 ? last8 : "—"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-amber-900 bg-amber-950/20 p-4 text-sm text-amber-100">
            Regenerating the token invalidates the old token immediately.
          </div>

          <button
            type="button"
            onClick={onGenerate}
            disabled={loading}
            className="w-full rounded-xl bg-zinc-50 text-zinc-950 font-medium py-3 disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate new token"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="text-lg font-semibold">Usage example</div>
        <div className="mt-1 text-sm text-zinc-400">
          Send only token counts — cost is computed later by the Analysis Engine.
        </div>

        <pre className="mt-4 overflow-auto rounded-xl border border-zinc-800 bg-black p-4 text-xs text-zinc-100">
{`await fetch('https://yourdomain.com/api/sdk/usage', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    provider_name: 'openai',
    model: 'gpt-4o',
    prompt_tokens: 150,
    completion_tokens: 300,
    total_tokens: 450,
    endpoint: '/v1/chat/completions',
    metadata: { feature: 'chat', session_id: 'abc123' }
  })
});`}
        </pre>
      </div>
    </div>
  );
}

