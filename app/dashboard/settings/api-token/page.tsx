import { requireUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import ApiTokenClient from "./ApiTokenClient";

export default async function ApiTokenPage() {
  const { userId } = await requireUser();

  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("api_token")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const token = (data as { api_token?: string } | null)?.api_token ?? "";
  const last8 = token.length ? token.slice(-8) : "";

  return <ApiTokenClient last8={last8} />;
}

