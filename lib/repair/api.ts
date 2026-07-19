import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  RepairRequestDetail,
  RepairRequestLead,
  RepairRequestPhoto,
  RepairRequestStatus,
  RepairUrgency,
} from "./types";

interface RepairRequestRow {
  id: string;
  created_at: string;
  service_type: string;
  description: string;
  location: string | null;
  zip: string;
  urgency: RepairUrgency;
  name: string;
  email: string;
  phone: string | null;
  status: RepairRequestStatus;
  photos?: RepairRequestPhoto[] | null;
}

function mapRow(row: RepairRequestRow): RepairRequestLead {
  return {
    id: row.id,
    createdAt: row.created_at,
    serviceType: row.service_type,
    description: row.description,
    location: row.location ?? "",
    zip: row.zip,
    urgency: row.urgency,
    name: row.name,
    email: row.email,
    phone: row.phone ?? "",
    status: row.status,
  };
}

function mapPhotos(photos: RepairRequestPhoto[] | null | undefined): RepairRequestPhoto[] {
  if (!Array.isArray(photos)) return [];
  return photos
    .filter(
      (photo) =>
        photo &&
        typeof photo.dataUrl === "string" &&
        photo.dataUrl.startsWith("data:image/")
    )
    .map((photo) => ({
      name: typeof photo.name === "string" ? photo.name : "",
      mimeType: typeof photo.mimeType === "string" ? photo.mimeType : "image/jpeg",
      dataUrl: photo.dataUrl,
      size: typeof photo.size === "number" ? photo.size : 0,
    }));
}

/**
 * Fetch pending homeowner repair requests for the vendor lead inbox.
 *
 * Query (equivalent SQL):
 *   select id, created_at, service_type, description, location, zip,
 *          urgency, name, email, phone, status
 *   from public.repair_requests
 *   where status = 'pending'
 *   order by created_at desc;
 *
 * Photos are intentionally omitted — jsonb dataUrls would bloat the list payload.
 */
export async function fetchPendingRepairRequests(): Promise<RepairRequestLead[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("repair_requests")
    .select(
      "id, created_at, service_type, description, location, zip, urgency, name, email, phone, status"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[repair-requests] fetch pending failed:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(
      error.message || "Could not load incoming repair requests."
    );
  }

  return (data as RepairRequestRow[] | null)?.map(mapRow) ?? [];
}

/**
 * Fetch a single repair request (including photos) for quote-form prefill.
 */
export async function fetchRepairRequestById(
  id: string
): Promise<RepairRequestDetail | null> {
  const trimmed = id.trim();
  if (!trimmed) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("repair_requests")
    .select(
      "id, created_at, service_type, description, location, zip, urgency, name, email, phone, status, photos"
    )
    .eq("id", trimmed)
    .maybeSingle();

  if (error) {
    console.error("[repair-requests] fetch by id failed:", {
      id: trimmed,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message || "Could not load this repair request.");
  }

  if (!data) return null;

  const row = data as RepairRequestRow;
  return {
    ...mapRow(row),
    photos: mapPhotos(row.photos),
  };
}

/** Mark a repair request as quoted after a vendor generates a quote from it. */
export async function markRepairRequestQuoted(id: string): Promise<void> {
  const trimmed = id.trim();
  if (!trimmed) return;

  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("repair_requests")
    .update({ status: "quoted" })
    .eq("id", trimmed)
    .eq("status", "pending");

  if (error) {
    // Non-fatal for quote generation — log and continue.
    console.error("[repair-requests] mark quoted failed:", {
      id: trimmed,
      code: error.code,
      message: error.message,
    });
  }
}
