import { requireUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

import GeneralSettingsClient from "./GeneralSettingsClient";

export default async function SettingsPage() {
  const { userId } = await requireUser();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("email,full_name")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return (
    <GeneralSettingsClient
      email={data?.email ?? null}
      initialFullName={data?.full_name ?? null}
    />
  );
}

