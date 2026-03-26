import { decryptApiKey, encryptApiKey } from "@/lib/crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ProviderRow } from "@/lib/types";

export type SaveProviderInput = {
  userId: string;
  providerName: string;
  displayName?: string | null;
  apiKey: string;
  isActive?: boolean;
};

export type ProviderListItem = {
  id: string;
  user_id: string;
  provider_name: string;
  display_name: string | null;
  is_active: boolean;
  /**
   * Only last 4 characters of the decrypted API key (no plaintext key returned).
   */
  api_key_masked_last4: string | null;
};

function maskLast4FromEncryptedValue(apiKeyEncrypted: string): string | null {
  try {
    const decrypted = decryptApiKey(apiKeyEncrypted);
    const trimmed = decrypted.trim();
    if (!trimmed) return null;
    return trimmed.slice(-4);
  } catch {
    // If encryption key is wrong/missing, do not fail provider listing.
    return null;
  }
}

export async function saveProvider(input: SaveProviderInput): Promise<ProviderRow> {
  const now = new Date().toISOString();
  const apiKeyEncrypted = encryptApiKey(input.apiKey);

  const isActive = input.isActive ?? true;

  // Avoid relying on a specific unique constraint existing in the DB.
  // We either update an existing row (by (user_id, provider_name)) or insert a new one.
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("providers")
    .select("*")
    .eq("user_id", input.userId)
    .eq("provider_name", input.providerName)
    .maybeSingle();

  if (existingError) throw new Error(`Failed to check provider: ${existingError.message}`);

  if (existing?.id) {
    const { data: updated, error: updateError } = await supabaseAdmin
      .from("providers")
      .update({
        display_name: input.displayName ?? null,
        api_key_encrypted: apiKeyEncrypted,
        is_active: isActive,
        updated_at: now,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (updateError) throw new Error(`Failed to update provider: ${updateError.message}`);
    return updated as ProviderRow;
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("providers")
    .insert({
      user_id: input.userId,
      provider_name: input.providerName,
      display_name: input.displayName ?? null,
      api_key_encrypted: apiKeyEncrypted,
      is_active: isActive,
      updated_at: now,
    })
    .select("*")
    .single();

  if (insertError) throw new Error(`Failed to insert provider: ${insertError.message}`);
  return inserted as ProviderRow;
}

export async function getProviderByUserAndName(
  userId: string,
  providerName: string
): Promise<ProviderRow | null> {
  const { data, error } = await supabaseAdmin
    .from("providers")
    .select("*")
    .eq("user_id", userId)
    .eq("provider_name", providerName)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch provider: ${error.message}`);
  }

  return (data as ProviderRow | null) ?? null;
}

export async function getProviderApiKey(
  userId: string,
  providerName: string
): Promise<string | null> {
  const provider = await getProviderByUserAndName(userId, providerName);
  if (!provider) {
    return null;
  }

  return decryptApiKey(provider.api_key_encrypted);
}

export async function listProvidersForUser(userId: string): Promise<ProviderListItem[]> {
  const { data, error } = await supabaseAdmin
    .from("providers")
    .select("id, user_id, provider_name, display_name, api_key_encrypted, is_active")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to list providers: ${error.message}`);

  const rows = (data ?? []) as ProviderRow[];
  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    provider_name: row.provider_name,
    display_name: row.display_name,
    is_active: row.is_active,
    api_key_masked_last4: maskLast4FromEncryptedValue(row.api_key_encrypted),
  }));
}

export async function setProviderActive(params: {
  userId: string;
  providerId: string;
  isActive: boolean;
}): Promise<ProviderListItem> {
  const { data: existing, error: existingError } = await supabaseAdmin
    .from("providers")
    .select("*")
    .eq("id", params.providerId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existingError) throw new Error(`Failed to load provider: ${existingError.message}`);
  if (!existing) throw new Error("Provider not found");

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("providers")
    .update({ is_active: params.isActive, updated_at: now })
    .eq("id", params.providerId)
    .eq("user_id", params.userId)
    .select("*")
    .single();

  if (updateError) throw new Error(`Failed to update provider: ${updateError.message}`);

  return {
    id: updated.id,
    user_id: updated.user_id,
    provider_name: updated.provider_name,
    display_name: updated.display_name,
    is_active: updated.is_active,
    api_key_masked_last4: maskLast4FromEncryptedValue(updated.api_key_encrypted),
  };
}

export async function disableProvider(params: {
  userId: string;
  providerId: string;
}): Promise<ProviderListItem> {
  return setProviderActive({
    userId: params.userId,
    providerId: params.providerId,
    isActive: false,
  });
}
