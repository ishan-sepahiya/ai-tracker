"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { supabase } from "@/lib/supabase-client";
import { createProfile } from "@/lib/actions/auth";

type SignupState = {
  email: string;
  password: string;
};

export default function SignupPage() {
  const router = useRouter();
  const nextPath = "/onboarding";

  const [state, setState] = useState<SignupState>({
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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: state.email.trim(),
        password: state.password,
      });

      if (signUpError) throw signUpError;

      const user = data.user;
      if (user) {
        await createProfile(user.id, user.email ?? null);
      }

      // If email confirmations are enabled, session may be null.
      if (data.session) {
        router.push(nextPath);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
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
          autoComplete="new-password"
          value={state.password}
          onChange={(e) =>
            setState((s) => ({ ...s, password: e.target.value }))
          }
          className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
          required
          minLength={6}
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
        {loading ? "Creating..." : "Create account"}
      </button>

      <div className="text-sm text-zinc-400">
        Already have an account?{" "}
        <a
          href="/login"
          className="text-zinc-200 hover:text-white underline underline-offset-2"
        >
          Sign in
        </a>
      </div>
    </form>
  );
}

