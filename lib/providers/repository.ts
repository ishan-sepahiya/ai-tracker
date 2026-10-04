import { supabaseAdmin } from "@/lib/supabase-admin";
import type { ProviderRow } from "@/lib/types";

export type SaveProviderInput = {
  userId: string;
  providerName: string;
  displayName?: string | null;
  modelName?: string | null;
  isCustom?: boolean;
  isActive?: boolean;
};

export type ProviderListItem = {
  id: string;
  user_id: string;
  provider_name: string;
  display_name: string | null;
  model_name: string | null;
  is_custom: boolean | null;
  is_active: boolean;
};

export async function saveProvider(
  input: SaveProviderInput
): Promise<ProviderRow> {
  const now = new Date().toISOString();

  const isActive =
    input.isActive ?? true;

  const isCustom =
    input.isCustom ?? false;

  // Check whether this provider already exists
  // for the authenticated user.
  const {
    data: existing,
    error: existingError,
  } = await supabaseAdmin
    .from("providers")
    .select(
      `
        id,
        user_id,
        provider_name,
        display_name,
        is_active,
        created_at,
        updated_at,
        is_custom,
        model_name
      `
    )
    .eq("user_id", input.userId)
    .eq(
      "provider_name",
      input.providerName
    )
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Failed to check provider: ${existingError.message}`
    );
  }

  // ----------------------------------------------------------
  // UPDATE EXISTING PROVIDER
  // ----------------------------------------------------------

  if (existing?.id) {
    const {
      data: updated,
      error: updateError,
    } = await supabaseAdmin
      .from("providers")
      .update({
        display_name:
          input.displayName ?? null,

        model_name:
          input.modelName ?? null,

        is_custom: isCustom,

        is_active: isActive,

        updated_at: now,
      })
      .eq("id", existing.id)
      .select(
        `
          id,
          user_id,
          provider_name,
          display_name,
          is_active,
          created_at,
          updated_at,
          is_custom,
          model_name
        `
      )
      .single();

    if (updateError) {
      throw new Error(
        `Failed to update provider: ${updateError.message}`
      );
    }

    return updated as ProviderRow;
  }

  // ----------------------------------------------------------
  // CREATE NEW PROVIDER
  // ----------------------------------------------------------

  const {
    data: inserted,
    error: insertError,
  } = await supabaseAdmin
    .from("providers")
    .insert({
      user_id: input.userId,
      provider_name: input.providerName,
      display_name:
        input.displayName ?? null,
      model_name:
        input.modelName ?? null,
      is_custom: isCustom,
      is_active: isActive,
      created_at: now,
      updated_at: now,
    })
    .select(
      `
        id,
        user_id,
        provider_name,
        display_name,
        is_active,
        created_at,
        updated_at,
        is_custom,
        model_name
      `
    )
    .single();

  if (insertError) {
    throw new Error(
      `Failed to insert provider: ${insertError.message}`
    );
  }

  return inserted as ProviderRow;
}

// ------------------------------------------------------------
// GET PROVIDER
// ------------------------------------------------------------

export async function getProviderByUserAndName(
  userId: string,
  providerName: string
): Promise<ProviderRow | null> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("providers")
    .select(
      `
        id,
        user_id,
        provider_name,
        display_name,
        is_active,
        created_at,
        updated_at,
        is_custom,
        model_name
      `
    )
    .eq("user_id", userId)
    .eq(
      "provider_name",
      providerName
    )
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch provider: ${error.message}`
    );
  }

  return (
    (data as ProviderRow | null) ??
    null
  );
}

// ------------------------------------------------------------
// PROVIDER API KEY
//
// Provider secrets now belong to provider_credentials.
// This legacy helper is retained so existing imports do not
// immediately break, but it no longer reads a nonexistent
// providers.api_key_encrypted column.
// ------------------------------------------------------------

export async function getProviderApiKey(
  _userId: string,
  _providerName: string
): Promise<string | null> {
  return null;
}

// ------------------------------------------------------------
// LIST PROVIDERS
// ------------------------------------------------------------

export async function listProvidersForUser(
  userId: string
): Promise<ProviderListItem[]> {
  const {
    data,
    error,
  } = await supabaseAdmin
    .from("providers")
    .select(
      `
        id,
        user_id,
        provider_name,
        display_name,
        is_active,
        is_custom,
        model_name
      `
    )
    .eq("user_id", userId)
    .order(
      "created_at",
      { ascending: false }
    );

  if (error) {
    throw new Error(
      `Failed to list providers: ${error.message}`
    );
  }

  return (data ?? []).map(
    (row) => ({
      id: row.id,
      user_id: row.user_id,
      provider_name:
        row.provider_name,
      display_name:
        row.display_name,
      model_name:
        row.model_name ?? null,
      is_custom:
        row.is_custom ?? null,
      is_active:
        row.is_active,
    })
  );
}

// ------------------------------------------------------------
// ENABLE / DISABLE PROVIDER
// ------------------------------------------------------------

export async function setProviderActive(
  params: {
    userId: string;
    providerId: string;
    isActive: boolean;
  }
): Promise<ProviderListItem> {
  const {
    data: existing,
    error: existingError,
  } = await supabaseAdmin
    .from("providers")
    .select(
      `
        id,
        user_id,
        provider_name,
        display_name,
        is_active,
        is_custom,
        model_name
      `
    )
    .eq("id", params.providerId)
    .eq("user_id", params.userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(
      `Failed to load provider: ${existingError.message}`
    );
  }

  if (!existing) {
    throw new Error(
      "Provider not found"
    );
  }

  const {
    data: updated,
    error: updateError,
  } = await supabaseAdmin
    .from("providers")
    .update({
      is_active:
        params.isActive,
      updated_at:
        new Date().toISOString(),
    })
    .eq("id", params.providerId)
    .eq("user_id", params.userId)
    .select(
      `
        id,
        user_id,
        provider_name,
        display_name,
        is_active,
        is_custom,
        model_name
      `
    )
    .single();

  if (updateError) {
    throw new Error(
      `Failed to update provider: ${updateError.message}`
    );
  }

  return {
    id: updated.id,
    user_id: updated.user_id,
    provider_name:
      updated.provider_name,
    display_name:
      updated.display_name,
    model_name:
      updated.model_name ?? null,
    is_custom:
      updated.is_custom ?? null,
    is_active:
      updated.is_active,
  };
}

export async function disableProvider(
  params: {
    userId: string;
    providerId: string;
  }
): Promise<ProviderListItem> {
  return setProviderActive({
    userId: params.userId,
    providerId: params.providerId,
    isActive: false,
  });
}