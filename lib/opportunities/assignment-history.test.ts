import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  fetchOpportunityAssignmentHistory,
  OPPORTUNITY_ASSIGNMENT_HISTORY_SELECT,
} from "./assignment-history";

function queryWith(data: unknown[] = [], error: Error | null = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    then: (
      resolve: (value: { data: unknown[]; error: Error | null }) => unknown
    ) => Promise.resolve({ data, error }).then(resolve),
  };
  for (const method of ["select", "eq", "is", "order", "limit"] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}

describe("fetchOpportunityAssignmentHistory", () => {
  it("uses trusted organization scope, bounds results, and maps typed events", async () => {
    const query = queryWith([{
      id: "history-1",
      opportunity_id: "opp-1",
      previous_assigned_user_id: "user-1",
      new_assigned_user_id: "user-2",
      actor_user_id: "user-3",
      source_system: "vendor_os",
      reason_code: "  workload_balance  ",
      occurred_at: "2026-07-28T12:00:00Z",
      created_at: "2026-07-28T12:00:00Z",
    }]);
    const client = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    await expect(fetchOpportunityAssignmentHistory(
      "user-3",
      { type: "organization", organizationId: "org-1", name: "Team" },
      "opp-1",
      500,
      client
    )).resolves.toEqual([{
      id: "history-1",
      previousAssignedUserId: "user-1",
      newAssignedUserId: "user-2",
      actorUserId: "user-3",
      sourceSystem: "vendor_os",
      reason: "workload_balance",
      occurredAt: "2026-07-28T12:00:00Z",
    }]);
    expect(client.from).toHaveBeenCalledWith("opportunity_assignment_history");
    expect(query.select).toHaveBeenCalledWith(
      OPPORTUNITY_ASSIGNMENT_HISTORY_SELECT
    );
    expect(query.eq).toHaveBeenCalledWith("opportunity_id", "opp-1");
    expect(query.eq).toHaveBeenCalledWith(
      "opportunity.organization_id",
      "org-1"
    );
    expect(query.order).toHaveBeenCalledWith("occurred_at", {
      ascending: false,
    });
    expect(query.limit).toHaveBeenCalledWith(50);
  });

  it("scopes personal history and preserves safe repository failures", async () => {
    const failure = new Error("raw SQL details");
    const query = queryWith([], failure);
    const client = {
      from: vi.fn().mockReturnValue(query),
    } as unknown as SupabaseClient;

    await expect(fetchOpportunityAssignmentHistory(
      "user-1",
      { type: "personal" },
      "opp-1",
      25,
      client
    )).rejects.toBe(failure);
    expect(query.eq).toHaveBeenCalledWith("opportunity.user_id", "user-1");
    expect(query.is).toHaveBeenCalledWith(
      "opportunity.organization_id",
      null
    );
  });
});
