import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  RepairRequestLead,
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
