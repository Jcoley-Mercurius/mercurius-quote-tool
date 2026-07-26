import { describe, expect, it } from "vitest";
import { mergeOpportunityTimeline } from "./history";

describe("mergeOpportunityTimeline", () => {
  it("merges status and assignment records by occurredAt descending", () => {
    const result = mergeOpportunityTimeline(
      [{
        id: "status-1",
        fromStatus: "new",
        toStatus: "opened",
        actorUserId: "user-1",
        sourceSystem: "vendor_os",
        reason: null,
        occurredAt: "2026-07-28T11:00:00Z",
      }],
      [{
        id: "assignment-1",
        previousAssignedUserId: null,
        newAssignedUserId: "user-1",
        actorUserId: "user-1",
        sourceSystem: "vendor_os",
        reason: null,
        occurredAt: "2026-07-28T12:00:00Z",
      }],
      "2026-07-28T10:00:00Z"
    );

    expect(result.map((event) => `${event.kind}:${event.id}`)).toEqual([
      "assignment:assignment-1",
      "status:status-1",
    ]);
  });

  it("retains the existing created fallback only when status loaded empty", () => {
    expect(mergeOpportunityTimeline([], [], "2026-07-28T10:00:00Z"))
      .toMatchObject([{ kind: "status", id: "created", toStatus: "new" }]);
    expect(mergeOpportunityTimeline([], [], null)).toEqual([]);
  });
});
