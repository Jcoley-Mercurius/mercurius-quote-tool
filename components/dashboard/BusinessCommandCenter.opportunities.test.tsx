import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { OpportunitySummary } from "@/lib/dashboard/types";
import { OpportunityRow, Priorities } from "./BusinessCommandCenter";

afterEach(cleanup);

describe("Business Command Center opportunity links", () => {
  it("links a populated recent opportunity to its detail workspace", () => {
    const item: OpportunitySummary = {
      id: "opp-1",
      title: "AC repair",
      status: "new",
      origin: "marketplace",
      customerName: "Jordan Lee",
      propertyLabel: "Cape Coral, FL",
      assignedUserId: null,
      createdAt: "2026-07-19T12:00:00Z",
      updatedAt: "2026-07-20T12:00:00Z",
    };
    render(<OpportunityRow item={item} now={new Date("2026-07-21T12:00:00Z")} />);
    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/opportunities/opp-1"
    );
  });

  it("deep-links Unassigned opportunities to the refined list", () => {
    render(
      <Priorities
        loading={false}
        newOpportunities={{ status: "ready", value: 2 }}
        unassignedOpportunities={{ status: "ready", value: 1 }}
        profileIncomplete={false}
        quoteChanges={0}
      />
    );
    expect(screen.getByRole("link", {
      name: /Unassigned opportunities/i,
    })).toHaveAttribute("href", "/opportunities?assignment=unassigned");
  });
});
