import type {
  OpportunityAssignmentHistoryItem,
  OpportunityHistoryItem,
  OpportunityTimelineItem,
} from "./types";

export function mergeOpportunityTimeline(
  statusEvents: OpportunityHistoryItem[],
  assignmentEvents: OpportunityAssignmentHistoryItem[],
  createdAt: string | null
): OpportunityTimelineItem[] {
  const statuses = statusEvents.length
    ? statusEvents
    : createdAt ? [{
        id: "created",
        fromStatus: null,
        toStatus: "new" as const,
        actorUserId: null,
        sourceSystem: "vendor_os" as const,
        reason: null,
        occurredAt: createdAt,
      }] : [];

  return [
    ...statuses.map((event) => ({ ...event, kind: "status" as const })),
    ...assignmentEvents.map((event) => ({
      ...event,
      kind: "assignment" as const,
    })),
  ].sort((left, right) => {
    const timeOrder =
      Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
    if (timeOrder !== 0) return timeOrder;
    return `${left.kind}:${left.id}`.localeCompare(`${right.kind}:${right.id}`);
  });
}
