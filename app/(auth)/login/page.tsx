"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/lib/supabase-client";

type LoginState = {
  email: string;
  password: string;
};

export default function LoginPage() {
  const router = useRouter();
  const nextPath = "/onboarding";

  const [state, setState] = useState<LoginState>({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: state.email.trim(),
        password: state.password,
      });

      if (signInError) throw signInError;

      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label className="block text-sm text-zinc-300 mb-2" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={state.email}
          onChange={(e) => setState((s) => ({ ...s, email: e.target.value }))}
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
          required
        />
      </div>

      <div>
        <label
          className="block text-sm text-zinc-300 mb-2"
          htmlFor="password"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={state.password}
          onChange={(e) =>
            setState((s) => ({ ...s, password: e.target.value }))
          }
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
          required
        />
      </div>

      {error ? (
        <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-zinc-50 text-zinc-950 font-medium py-3 disabled:opacity-60"
      >
        {loading ? "Signing in..." : "Sign in"}
      </button>

      <div className="text-sm text-zinc-400">
        No account?{" "}
        <a
          href="/signup"
          className="text-zinc-200 hover:text-white underline underline-offset-2"
        >
          Create one
        </a>
      </div>
    </form>
  );
}

