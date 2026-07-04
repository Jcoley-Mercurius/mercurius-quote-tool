import { loadQuotesFromStorage, QUOTE_HISTORY_KEY } from "@/lib/quotes/storage";
import type { SavedQuote } from "@/lib/quotes/types";
import type { Workspace } from "@/lib/organizations/types";
import { loadVendorProfile } from "@/lib/vendor/storage";
import { DEFAULT_VENDOR_PROFILE } from "@/lib/vendor/defaults";
import type { VendorProfile } from "@/lib/vendor/types";
import { getSupabaseClient } from "./client";
import {
  rowToSavedQuote,
  rowToVendorProfile,
  savedQuoteToRow,
  vendorProfileToRow,
  type QuoteRow,
  type VendorProfileRow,
} from "./types";

const VENDOR_STORAGE_KEY = "mercurius-vendor-profile";
const MIGRATION_FLAG_KEY = "mercurius-supabase-migrated";

let migrationPromise: Promise<void> | null = null;

function hasLocalVendorData(profile: VendorProfile): boolean {
  return JSON.stringify(profile) !== JSON.stringify(DEFAULT_VENDOR_PROFILE);
}

export async function migrateLocalDataToSupabase(
  userId: string
): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG_KEY) === userId) return;

  if (migrationPromise) {
    await migrationPromise;
    return;
  }

  migrationPromise = runMigration(userId);
  try {
    await migrationPromise;
  } finally {
    migrationPromise = null;
  }
}

async function runMigration(userId: string): Promise<void> {
  if (localStorage.getItem(MIGRATION_FLAG_KEY) === userId) return;

  const supabase = getSupabaseClient();
  const localQuotes = loadQuotesFromStorage();
  const localProfile = loadVendorProfile();

  if (localQuotes.length > 0) {
    const { data: existingQuotes } = await supabase
      .from("quotes")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (!existingQuotes?.length) {
      const rows = localQuotes.map((quote) => {
        const migrated: SavedQuote = {
          ...quote,
          id: crypto.randomUUID(),
        };
        return savedQuoteToRow(userId, migrated);
      });

      const { data, error } = await supabase
        .from("quotes")
        .insert(rows)
        .select("*");

      if (error) throw error;
      if (data?.length) {
        localStorage.removeItem(QUOTE_HISTORY_KEY);
      }
    }
  }

  if (hasLocalVendorData(localProfile)) {
    const { data: existingProfile } = await supabase
      .from("vendor_profiles")
      .select("id")
      .eq("user_id", userId)
      .is("organization_id", null)
      .maybeSingle();

    if (!existingProfile) {
      const { error } = await supabase.from("vendor_profiles").insert(
        vendorProfileToRow(userId, localProfile, { type: "personal" })
      );
      if (error) throw error;
      localStorage.removeItem(VENDOR_STORAGE_KEY);
    }
  }

  localStorage.setItem(MIGRATION_FLAG_KEY, userId);
}

export async function fetchQuotesForWorkspace(
  userId: string,
  workspace: Workspace
): Promise<SavedQuote[]> {
  const supabase = getSupabaseClient();

  let query = supabase.from("quotes").select("*");

  if (workspace.type === "personal") {
    query = query.eq("user_id", userId).is("organization_id", null);
  } else {
    query = query.eq("organization_id", workspace.organizationId);
  }

  const { data, error } = await query.order("updated_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as QuoteRow[]).map(rowToSavedQuote);
}

/** @deprecated Use fetchQuotesForWorkspace */
export async function fetchQuotesForUser(userId: string): Promise<SavedQuote[]> {
  return fetchQuotesForWorkspace(userId, { type: "personal" });
}

export async function fetchVendorProfileForWorkspace(
  userId: string,
  workspace: Workspace
): Promise<VendorProfile | null> {
  const supabase = getSupabaseClient();

  let query = supabase.from("vendor_profiles").select("*");

  if (workspace.type === "personal") {
    query = query.eq("user_id", userId).is("organization_id", null);
  } else {
    query = query.eq("organization_id", workspace.organizationId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return rowToVendorProfile(data as VendorProfileRow);
}

/** @deprecated Use fetchVendorProfileForWorkspace */
export async function fetchVendorProfileForUser(
  userId: string
): Promise<VendorProfile | null> {
  return fetchVendorProfileForWorkspace(userId, { type: "personal" });
}

export async function upsertQuoteRow(
  userId: string,
  quote: SavedQuote
): Promise<SavedQuote> {
  const supabase = getSupabaseClient();
  const row = savedQuoteToRow(userId, quote);

  const { data, error } = await supabase
    .from("quotes")
    .upsert(row)
    .select("*")
    .single();

  if (error) throw error;
  return rowToSavedQuote(data as QuoteRow);
}

export async function deleteQuoteRow(id: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("quotes").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertVendorProfileRow(
  userId: string,
  profile: VendorProfile,
  workspace: Workspace
): Promise<VendorProfile> {
  const supabase = getSupabaseClient();
  const row = vendorProfileToRow(userId, profile, workspace);

  let existingQuery = supabase.from("vendor_profiles").select("id");

  if (workspace.type === "personal") {
    existingQuery = existingQuery
      .eq("user_id", userId)
      .is("organization_id", null);
  } else {
    existingQuery = existingQuery.eq(
      "organization_id",
      workspace.organizationId
    );
  }

  const { data: existing, error: existingError } =
    await existingQuery.maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { data, error } = await supabase
      .from("vendor_profiles")
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) throw error;
    return rowToVendorProfile(data as VendorProfileRow);
  }

  const { data, error } = await supabase
    .from("vendor_profiles")
    .insert(row)
    .select("*")
    .single();

  if (error) throw error;
  return rowToVendorProfile(data as VendorProfileRow);
}