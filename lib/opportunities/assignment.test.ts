import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  assignOpportunity,
  OpportunityAssignmentError,
} from "./assignment";

function clientWith(result: { data?: unknown; error?: { code?: string; message?: string } }) {
  return {
    rpc: vi.fn().mockResolvedValue({
      data: result.data ?? null,
      error: result.error ?? null,
    }),
  } as unknown as SupabaseClient;
}

describe("assignOpportunity", () => {
  it("calls only the assignment RPC and maps its authoritative response", async () => {
    const client = clientWith({
      data: [{
        opportunity_id: "opp-1",
        assigned_user_id: "user-2",
        updated_at: "2026-07-26T18:00:00.000Z",
        history_id: "history-1",
        occurred_at: "2026-07-26T18:00:00.000Z",
      }],
    });

    await expect(assignOpportunity({
      opportunityId: "opp-1",
      assignedUserId: "user-2",
      expectedUpdatedAt: "2026-07-26T17:00:00.000Z",
      reasonCode: "  workload_balance  ",
    }, client)).resolves.toEqual({
      opportunityId: "opp-1",
      assignedUserId: "user-2",
      updatedAt: "2026-07-26T18:00:00.000Z",
      historyId: "history-1",
      occurredAt: "2026-07-26T18:00:00.000Z",
    });

    expect(client.rpc).toHaveBeenCalledWith("assign_opportunity", {
      p_opportunity_id: "opp-1",
      p_assigned_user_id: "user-2",
      p_expected_updated_at: "2026-07-26T17:00:00.000Z",
      p_reason_code: "workload_balance",
    });
  });

  it.each([
    ["P0002", "Opportunity not found", "not_found"],
    ["42501", "Not authorized", "forbidden"],
    ["40001", "Opportunity assignment is stale", "conflict"],
    ["22023", "Opportunity already has that assignment", "invalid"],
    ["22P02", "invalid input syntax for type uuid", "invalid"],
    ["XX000", "database unavailable", "unavailable"],
  ] as const)("maps database error %s to %s", async (code, message, expectedCode) => {
    const client = clientWith({ error: { code, message } });
    const error = await assignOpportunity({
      opportunityId: "opp-1",
      assignedUserId: null,
    }, client).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(OpportunityAssignmentError);
    expect(error).toMatchObject({ code: expectedCode });
  });

  it("distinguishes an unauthenticated RPC response", async () => {
    const client = clientWith({
      error: { code: "42501", message: "Not authenticated" },
    });

    await expect(assignOpportunity({
      opportunityId: "opp-1",
      assignedUserId: null,
    }, client)).rejects.toMatchObject({ code: "not_authenticated" });
  });

  it("rejects a missing authoritative response", async () => {
    await expect(assignOpportunity({
      opportunityId: "opp-1",
      assignedUserId: null,
    }, clientWith({ data: [] }))).rejects.toMatchObject({ code: "unavailable" });
  });
});
