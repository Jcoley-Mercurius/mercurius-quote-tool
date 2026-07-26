import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { AssignOpportunityRpcRow } from "@/lib/supabase/types";

export type OpportunityAssignmentErrorCode =
  | "not_authenticated"
  | "not_found"
  | "forbidden"
  | "conflict"
  | "invalid"
  | "unavailable";

export class OpportunityAssignmentError extends Error {
  readonly code: OpportunityAssignmentErrorCode;

  constructor(code: OpportunityAssignmentErrorCode, message: string) {
    super(message);
    this.name = "OpportunityAssignmentError";
    this.code = code;
  }
}

export interface AssignOpportunityInput {
  opportunityId: string;
  assignedUserId: string | null;
  expectedUpdatedAt?: string | null;
  reasonCode?: string | null;
}

export interface OpportunityAssignmentResult {
  opportunityId: string;
  assignedUserId: string | null;
  updatedAt: string;
  historyId: string;
  occurredAt: string;
}

interface SupabaseLikeError {
  code?: string;
  message?: string;
}

function assignmentError(error: SupabaseLikeError): OpportunityAssignmentError {
  const message = error.message ?? "";
  if (/not authenticated/i.test(message)) {
    return new OpportunityAssignmentError(
      "not_authenticated",
      "Sign in to assign this opportunity."
    );
  }
  if (error.code === "P0002") {
    return new OpportunityAssignmentError(
      "not_found",
      "Opportunity not found in the active workspace."
    );
  }
  if (error.code === "42501") {
    return new OpportunityAssignmentError(
      "forbidden",
      "You do not have permission to make that assignment."
    );
  }
  if (error.code === "40001") {
    return new OpportunityAssignmentError(
      "conflict",
      "This opportunity changed. Refresh it and try again."
    );
  }
  if (error.code === "22023" || error.code === "22P02") {
    return new OpportunityAssignmentError(
      "invalid",
      "That assignment request is not valid."
    );
  }
  return new OpportunityAssignmentError(
    "unavailable",
    "The opportunity could not be assigned. Try again in a moment."
  );
}

export async function assignOpportunity(
  input: AssignOpportunityInput,
  client: SupabaseClient = getSupabaseClient()
): Promise<OpportunityAssignmentResult> {
  const { data, error } = await client.rpc("assign_opportunity", {
    p_opportunity_id: input.opportunityId,
    p_assigned_user_id: input.assignedUserId,
    p_expected_updated_at: input.expectedUpdatedAt ?? null,
    p_reason_code: input.reasonCode?.trim() || null,
  });

  if (error) throw assignmentError(error);
  const row = (data as AssignOpportunityRpcRow[] | null)?.[0];
  if (!row) {
    throw new OpportunityAssignmentError(
      "unavailable",
      "The assignment response was unavailable."
    );
  }

  return {
    opportunityId: row.opportunity_id,
    assignedUserId: row.assigned_user_id,
    updatedAt: row.updated_at,
    historyId: row.history_id,
    occurredAt: row.occurred_at,
  };
}
