"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase-client";
import {
  deleteAccountSoft,
  updateFullName,
} from "@/lib/actions/settings";

export default function GeneralSettingsClient(props: {
  email: string | null;
  initialFullName: string | null;
}) {
  const router = useRouter();

  const [fullName, setFullName] = useState(props.initialFullName ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function onSaveName() {
    setError(null);
    setOk(null);
    setSaving(true);
    try {
      await updateFullName(fullName);
      setOk("Saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function onChangePassword() {
    setError(null);
    setOk(null);
    setSubmittingPassword(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw updateError;
      setOk("Password updated.");
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update password");
    } finally {
      setSubmittingPassword(false);
    }
  }

  async function onDeleteAccount() {
    const okToDelete = window.confirm(
      "Delete your account? This will cancel your subscription and revoke SDK access."
    );
    if (!okToDelete) return;

    setError(null);
    setOk(null);
    setDeleting(true);
    try {
      await deleteAccountSoft();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setDeleting(false);
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
        <div className="text-lg font-semibold">General</div>
        <div className="mt-1 text-sm text-zinc-400">
          Manage your profile and security.
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-zinc-300">Full name</div>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
              placeholder="Your name"
            />
          </div>

          <button
            type="button"
            onClick={onSaveName}
            disabled={saving}
            className="w-full rounded-xl bg-zinc-50 text-zinc-950 font-medium py-3 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>

          <div className="pt-3 border-t border-zinc-800">
            <div className="text-sm text-zinc-400">
              Signed in as {props.email ?? "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5">
        <div className="text-lg font-semibold">Change password</div>
        <div className="mt-1 text-sm text-zinc-400">
          Updates your password via Supabase Auth.
        </div>

        <div className="mt-5 space-y-4">
          <div className="space-y-2">
            <div className="text-sm text-zinc-300">New password</div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-2 text-zinc-50 outline-none focus:border-zinc-600"
              placeholder="••••••••"
            />
          </div>

          <button
            type="button"
            onClick={onChangePassword}
            disabled={submittingPassword || password.length < 6}
            className="w-full rounded-xl bg-zinc-50 text-zinc-950 font-medium py-3 disabled:opacity-60"
          >
            {submittingPassword ? "Updating..." : "Update password"}
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-red-900 bg-red-950/20 p-5">
        <div className="text-lg font-semibold text-red-100">Delete account</div>
        <div className="mt-1 text-sm text-red-200">
          Soft deletes your subscription, revokes SDK access, and anonymizes
          profile data.
        </div>

        <div className="mt-5">
          <button
            type="button"
            onClick={onDeleteAccount}
            disabled={deleting}
            className="w-full rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200 font-semibold disabled:opacity-60"
          >
            {deleting ? "Deleting..." : "Delete account"}
          </button>
        </div>
      </div>
    </div>
  );
}

