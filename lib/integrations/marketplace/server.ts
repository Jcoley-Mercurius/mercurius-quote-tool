import "server-only";

import type { MarketplaceLeadAssignedV1 } from "@/lib/integrations/events";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";

export type MarketplaceProcessingStatus =
  | "processed"
  | "already_processed"
  | "event_processing"
  | "unknown_marketplace_vendor"
  | "projection_failed";

export interface MarketplaceIngestionResult {
  processingStatus: MarketplaceProcessingStatus;
  eventId: string;
  organizationId: string | null;
  opportunityId: string | null;
  errorCode: string | null;
}

interface RpcResultRow {
  processing_status: MarketplaceProcessingStatus;
  event_id: string;
  organization_id: string | null;
  opportunity_id: string | null;
  error_code: string | null;
}

export async function processMarketplaceLeadAssigned(
  event: MarketplaceLeadAssignedV1,
  receivedAt: string
): Promise<MarketplaceIngestionResult> {
  const client = createAdminSupabaseClient();
  const { data, error } = await client.rpc(
    "process_marketplace_lead_assigned",
    {
      p_event: event,
      p_received_at: receivedAt,
    }
  );

  if (error) {
    throw new Error("Marketplace ingestion RPC failed");
  }

  const row = (data as RpcResultRow[] | null)?.[0];
  if (!row) {
    throw new Error("Marketplace ingestion RPC returned no result");
  }

  return {
    processingStatus: row.processing_status,
    eventId: row.event_id,
    organizationId: row.organization_id,
    opportunityId: row.opportunity_id,
    errorCode: row.error_code,
  };
}
