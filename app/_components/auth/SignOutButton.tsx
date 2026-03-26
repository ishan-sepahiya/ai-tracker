"use client";

import { useRouter } from "next/navigation";

import { supabase } from "@/lib/supabase-client";

export default function SignOutButton() {
  const router = useRouter();

  async function onSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-900"
    >
      Sign out
    </button>
  );
}

