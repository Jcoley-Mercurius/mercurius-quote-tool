import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CustomerTimelineItem } from "@/lib/customers/types";
import { CustomerTimeline } from "./CustomerDetailWorkspace";

afterEach(cleanup);

const items: CustomerTimelineItem[] = [
  {
    id: "status:event-1",
    kind: "opportunity",
    title: "New → Opened",
    detail: "Opportunity status",
    occurredAt: "2026-07-25T10:00:00Z",
    actorUserId: "current-member",
  },
  {
    id: "assignment:event-2",
    kind: "assignment",
    title: "Assignment changed",
    detail: "Opportunity assignment",
    occurredAt: "2026-07-24T10:00:00Z",
    actorUserId: "former-member",
  },
  {
    id: "quote:event-3",
    kind: "quote",
    title: "Quote MQ-1 created",
    detail: "Draft",
    occurredAt: "2026-07-23T10:00:00Z",
    actorUserId: null,
  },
];

describe("CustomerTimeline", () => {
  it("uses a semantic ordered list and safe current/former actor labels", () => {
    render(<CustomerTimeline
      items={items}
      memberLabels={new Map([["current-member", "Morgan Member"]])}
      membersAvailable
    />);
    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getByText(/Actor: Morgan Member/)).toBeInTheDocument();
    expect(screen.getByText(/Actor: Former team member/)).toBeInTheDocument();
    expect(screen.queryByText(/current-member|former-member/)).not.toBeInTheDocument();
  });

  it("uses Unknown team member when membership identities are unavailable", () => {
    render(<CustomerTimeline
      items={[items[0]]}
      memberLabels={new Map()}
      membersAvailable={false}
    />);
    expect(screen.getByText(/Actor: Unknown team member/)).toBeInTheDocument();
  });
});
