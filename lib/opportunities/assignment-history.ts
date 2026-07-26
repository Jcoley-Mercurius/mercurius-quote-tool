import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/organizations/types";
import type { OpportunityAssignmentHistoryRow } from "@/lib/supabase/types";
import type { OpportunityAssignmentHistoryItem } from "./types";

export const OPPORTUNITY_ASSIGNMENT_HISTORY_SELECT = `
  id, previous_assigned_user_id, new_assigned_user_id, actor_user_id,
  source_system, reason_code, occurred_at,
  opportunity:opportunities!inner(id)
`;

function scopeOpportunity<T extends {
  eq: (column: string, value: string) => T;
  is: (column: string, value: null) => T;
}>(query: T, userId: string, workspace: Workspace): T {
  return workspace.type === "organization"
    ? query.eq("opportunity.organization_id", workspace.organizationId)
    : query.eq("opportunity.user_id", userId)
      .is("opportunity.organization_id", null);
}

export async function fetchOpportunityAssignmentHistory(
  userId: string,
  workspace: Workspace,
  opportunityId: string,
  limit = 25,
  client: SupabaseClient = getSupabaseClient()
): Promise<OpportunityAssignmentHistoryItem[]> {
  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 50);
  let query = client.from("opportunity_assignment_history")
    .select(OPPORTUNITY_ASSIGNMENT_HISTORY_SELECT)
    .eq("opportunity_id", opportunityId);
  query = scopeOpportunity(query, userId, workspace);
  const { data, error } = await query
    .order("occurred_at", { ascending: false })
    .limit(boundedLimit);
  if (error) throw error;
  return ((data ?? []) as unknown as OpportunityAssignmentHistoryRow[]).map(
    (row) => ({
      id: row.id,
      previousAssignedUserId: row.previous_assigned_user_id,
      newAssignedUserId: row.new_assigned_user_id,
      actorUserId: row.actor_user_id,
      sourceSystem: row.source_system,
      reason: row.reason_code?.trim() || null,
      occurredAt: row.occurred_at,
    })
  );
}
