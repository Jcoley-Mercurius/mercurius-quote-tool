import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type {
  OpportunityDetail,
  OpportunityHistoryItem,
  OpportunityLinkedQuote,
} from "@/lib/opportunities/types";
import {
  CustomerContextCard,
  AssignmentContextCard,
  LinkedQuotesSection,
  OpportunityDetailPageState,
  OpportunityHeader,
  OpportunityRequestCard,
  OpportunityTimeline,
  PropertyContextCard,
} from "./OpportunityDetailWorkspace";

afterEach(cleanup);

const detail: OpportunityDetail = {
  id: "opp-1",
  title: "Air conditioner repair",
  serviceType: "HVAC",
  origin: "marketplace",
  status: "opened",
  description: "The downstairs system is not cooling.",
  assignedUserId: null,
  customer: {
    id: "customer-1",
    displayName: "Jordan Lee",
    email: "jordan@example.com",
    phone: "+1 555 0100",
    preferredContactMethod: "email",
  },
  property: {
    id: "property-1",
    addressLine1: "10 Palm Ave",
    addressLine2: null,
    city: "Cape Coral",
    region: "FL",
    postalCode: "33904",
    countryCode: "US",
  },
  marketplaceContext: {
    assignedAt: "2026-07-20T12:00:00Z",
    serviceCategory: { code: "hvac", displayName: "HVAC" },
    requestTitle: "AC repair",
    requestDescription: "No cooling",
    preferredTiming: "Weekday morning",
    budgetRange: {
      minimumAmountMinor: 12500,
      maximumAmountMinor: 25000,
      currency: "USD",
    },
  },
  openedAt: "2026-07-21T12:00:00Z",
  declinedAt: null,
  closedAt: null,
  createdAt: "2026-07-20T12:00:00Z",
  updatedAt: "2026-07-21T12:00:00Z",
};

describe("Opportunity detail sections", () => {
  it("renders the full header, request, and allowlisted Marketplace context", () => {
    render(<><OpportunityHeader detail={detail} /><OpportunityRequestCard detail={detail} /></>);
    expect(screen.getByRole("heading", { level: 1, name: detail.title })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /back to opportunities/i })).toHaveAttribute("href", "/opportunities");
    expect(screen.getByText(detail.description!)).toBeInTheDocument();
    expect(screen.getByText("Weekday morning")).toBeInTheDocument();
    expect(screen.getByText("$125.00–$250.00")).toBeInTheDocument();
    expect(screen.getByText("Homeowner-provided budget range")).toBeInTheDocument();
    expect(screen.queryByText(/marketplaceLeadId|source_snapshot|raw/i)).not.toBeInTheDocument();
  });

  it("omits Marketplace-only context for direct opportunities", () => {
    render(<OpportunityRequestCard detail={{
      ...detail,
      origin: "direct",
      marketplaceContext: null,
    }} />);
    expect(screen.queryByText("Marketplace request context")).not.toBeInTheDocument();
    expect(screen.queryByText("Homeowner-provided budget range")).not.toBeInTheDocument();
  });

  it("renders safe missing customer, property, and description states", () => {
    const partial = { ...detail, customer: null, property: null, description: null };
    render(<>
      <OpportunityRequestCard detail={partial} />
      <CustomerContextCard detail={partial} />
      <PropertyContextCard detail={partial} />
    </>);
    expect(screen.getByText("Request description unavailable.")).toBeInTheDocument();
    expect(screen.getByText("Customer details unavailable.")).toBeInTheDocument();
    expect(screen.getByText("Property details unavailable")).toBeInTheDocument();
  });

  it("renders unassigned and unknown assignment fallbacks without controls", () => {
    const { rerender } = render(<AssignmentContextCard assignmentLabel="Unassigned" />);
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    rerender(<AssignmentContextCard assignmentLabel="Assigned team member" />);
    expect(screen.getByText("Assigned team member")).toBeInTheDocument();
  });

  it("renders linked quotes and their existing quote routes", () => {
    const quote: OpportunityLinkedQuote = {
      id: "quote-1",
      reference: "MQ-1001",
      title: "HVAC repair",
      status: "draft",
      createdAt: detail.createdAt,
      updatedAt: detail.updatedAt,
    };
    const { rerender } = render(
      <LinkedQuotesSection result={{ status: "ready", value: [quote] }} />
    );
    expect(screen.getByRole("link", { name: /HVAC repair/i })).toHaveAttribute(
      "href",
      "/quote?quoteId=quote-1"
    );
    rerender(<LinkedQuotesSection result={{ status: "ready", value: [] }} />);
    expect(screen.getByText("No quotes created for this opportunity yet.")).toBeInTheDocument();
    rerender(<LinkedQuotesSection result={{ status: "error", message: "Linked quotes are unavailable." }} />);
    expect(screen.getByText("Linked quotes are unavailable.")).toBeInTheDocument();
  });

  it("renders history and a created fallback without fabricated events", () => {
    const history: OpportunityHistoryItem = {
      id: "history-1",
      fromStatus: "new",
      toStatus: "opened",
      actorUserId: "member-1",
      sourceSystem: "vendor_os",
      reason: "customer_contacted",
      occurredAt: detail.updatedAt,
    };
    const { rerender } = render(
      <OpportunityTimeline
        result={{ status: "ready", value: [history] }}
        createdAt={detail.createdAt}
        memberLabels={new Map([["member-1", "Alex Morgan"]])}
      />
    );
    expect(screen.getByText("New → Opened")).toBeInTheDocument();
    expect(screen.getByText("Actor: Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("Reason: Customer Contacted")).toBeInTheDocument();
    rerender(
      <OpportunityTimeline
        result={{ status: "ready", value: [] }}
        createdAt={detail.createdAt}
        memberLabels={new Map()}
      />
    );
    expect(screen.getByText("Created as New")).toBeInTheDocument();
  });

  it("renders indistinguishable not-found navigation and a core error state", () => {
    const { rerender } = render(
      <OpportunityDetailPageState
        title="Opportunity not found"
        detail="This opportunity is unavailable in the active workspace."
      />
    );
    expect(screen.getByRole("heading", { level: 1, name: "Opportunity not found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Opportunities" })).toHaveAttribute("href", "/opportunities");
    rerender(
      <OpportunityDetailPageState
        title="Opportunity couldn’t be loaded"
        detail="Try returning to Opportunities and opening it again."
      />
    );
    expect(screen.getByRole("heading", { level: 1, name: "Opportunity couldn’t be loaded" })).toBeInTheDocument();
  });
});
