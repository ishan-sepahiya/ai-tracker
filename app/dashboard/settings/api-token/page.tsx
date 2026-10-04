import { requireUser } from "@/lib/auth/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import ApiTokenClient from "./ApiTokenClient";

export default async function ApiTokenPage() {
  const { userId } =
    await requireUser();

  const {
    data,
    error,
  } =
    await supabaseAdmin
      .from("profiles")
      .select(
        "api_token_last8,api_token",
      )
      .eq("id", userId)
      .maybeSingle();

  if (error) {
    throw new Error(
      error.message,
    );
  }

  const row = data as {
    api_token_last8?: string | null;
    api_token?: string | null;
  } | null;

  const last8 =
    row?.api_token_last8 ??
    (row?.api_token
      ? row.api_token.slice(-8)
      : "");

  return (
    <ApiTokenClient
      last8={last8}
    />
  );
}