import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type {
  OpportunityDetail,
  OpportunityHistoryItem,
  OpportunityLinkedQuote,
} from "@/lib/opportunities/types";
import {
  CustomerContextCard,
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
    expect(screen.getByRole("link", { name: "Create Quote" })).toHaveAttribute(
      "href",
      "/quote?opportunityId=opp-1"
    );
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
        statusResult={{ status: "ready", value: [history] }}
        assignmentResult={{ status: "ready", value: [] }}
        createdAt={detail.createdAt}
        memberLabels={new Map([["member-1", "Alex Morgan"]])}
        membersAvailable
      />
    );
    expect(screen.getByText("New → Opened")).toBeInTheDocument();
    expect(screen.getByText("Actor: Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("Actor: Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("Reason: Customer Contacted")).toBeInTheDocument();
    rerender(
      <OpportunityTimeline
        statusResult={{ status: "ready", value: [] }}
        assignmentResult={{ status: "ready", value: [] }}
        createdAt={detail.createdAt}
        memberLabels={new Map()}
        membersAvailable
      />
    );
    expect(screen.getByText("Created as New")).toBeInTheDocument();
  });

  it("preserves the existing status actor fallback", () => {
    render(
      <OpportunityTimeline
        statusResult={{
          status: "ready",
          value: [{
            id: "status-unknown-actor",
            fromStatus: "new",
            toStatus: "opened",
            actorUserId: "missing-status-actor",
            sourceSystem: "vendor_os",
            reason: null,
            occurredAt: detail.updatedAt,
          }],
        }}
        assignmentResult={{ status: "ready", value: [] }}
        createdAt={detail.createdAt}
        memberLabels={new Map()}
        membersAvailable
      />
    );
    expect(screen.getByText("Actor: Team member")).toBeInTheDocument();
    expect(screen.queryByText("Former team member")).not.toBeInTheDocument();
  });

  it("renders assignment events with safe current, former, and unknown labels", () => {
    render(
      <OpportunityTimeline
        statusResult={{ status: "ready", value: [] }}
        assignmentResult={{
          status: "ready",
          value: [
            {
              id: "self-assigned",
              previousAssignedUserId: "former-1",
              newAssignedUserId: "member-1",
              actorUserId: "member-1",
              sourceSystem: "vendor_os",
              reason: null,
              occurredAt: "2026-07-24T12:00:00Z",
            },
            {
              id: "assigned",
              previousAssignedUserId: null,
              newAssignedUserId: "member-1",
              actorUserId: "owner-1",
              sourceSystem: "vendor_os",
              reason: null,
              occurredAt: "2026-07-23T12:00:00Z",
            },
            {
              id: "reassigned",
              previousAssignedUserId: "former-1",
              newAssignedUserId: "member-1",
              actorUserId: null,
              sourceSystem: "vendor_os",
              reason: null,
              occurredAt: "2026-07-22T12:00:00Z",
            },
            {
              id: "cleared",
              previousAssignedUserId: null,
              newAssignedUserId: null,
              actorUserId: null,
              sourceSystem: "vendor_os",
              reason: null,
              occurredAt: "2026-07-21T12:00:00Z",
            },
          ],
        }}
        createdAt={detail.createdAt}
        memberLabels={new Map([
          ["member-1", "Alex Morgan"],
          ["owner-1", "owner@example.com"],
        ])}
        membersAvailable
      />
    );

    expect(screen.getByText("Assigned · Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("Self-assigned · Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText(
      "Reassigned · Former team member → Alex Morgan"
    )).toBeInTheDocument();
    expect(screen.getByText(
      "Assignment cleared · Unknown team member"
    )).toBeInTheDocument();
    expect(screen.getByText("Actor: owner@example.com")).toBeInTheDocument();
    expect(screen.queryByText(/former-1|member-1|owner-1/)).not.toBeInTheDocument();
  });

  it("keeps status history visible when assignment history fails safely", () => {
    render(
      <OpportunityTimeline
        statusResult={{
          status: "ready",
          value: [{
            id: "status-1",
            fromStatus: "new",
            toStatus: "opened",
            actorUserId: null,
            sourceSystem: "vendor_os",
            reason: null,
            occurredAt: detail.updatedAt,
          }],
        }}
        assignmentResult={{
          status: "error",
          message: "Assignment history is temporarily unavailable.",
        }}
        createdAt={detail.createdAt}
        memberLabels={new Map()}
        membersAvailable={false}
      />
    );

    expect(screen.getByText("New → Opened")).toBeInTheDocument();
    expect(screen.getByText(
      "Assignment history is temporarily unavailable."
    )).toBeInTheDocument();
    expect(screen.queryByText(/SQL|UUID/i)).not.toBeInTheDocument();
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
