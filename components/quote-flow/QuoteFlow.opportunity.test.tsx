import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { OpportunityDetail } from "@/lib/opportunities/types";
import {
  OpportunityPrefillError,
  OpportunityQuoteContext,
  resolveQuoteRouteMode,
  resolveQuoteSaveContext,
} from "./QuoteFlow";

afterEach(cleanup);

const detail = {
  id: "opp-1",
  title: "Air conditioner repair",
} as OpportunityDetail;

describe("opportunity quote route and workspace behavior", () => {
  it("uses quote, opportunity, repair, then blank precedence", () => {
    expect(resolveQuoteRouteMode({
      quoteId: "quote-1",
      opportunityId: "opp-1",
      repairRequestId: "repair-1",
    })).toEqual({ type: "quote", id: "quote-1" });
    expect(resolveQuoteRouteMode({
      quoteId: null,
      opportunityId: "opp-1",
      repairRequestId: "repair-1",
    })).toEqual({ type: "opportunity", id: "opp-1" });
    expect(resolveQuoteRouteMode({
      quoteId: null,
      opportunityId: null,
      repairRequestId: "repair-1",
    })).toEqual({ type: "repair", id: "repair-1" });
    expect(resolveQuoteRouteMode({
      quoteId: null,
      opportunityId: null,
      repairRequestId: null,
    })).toEqual({ type: "blank" });
  });

  it("overrides unsafe targets with the loaded opportunity workspace", () => {
    const organization = {
      type: "organization" as const,
      organizationId: "org-1",
      name: "Team",
    };
    expect(resolveQuoteSaveContext(
      detail,
      organization,
      { type: "personal" }
    )).toEqual({ target: organization, opportunityId: "opp-1" });
    expect(resolveQuoteSaveContext(
      detail,
      { type: "personal" },
      organization
    )).toEqual({ target: { type: "personal" }, opportunityId: "opp-1" });
    expect(resolveQuoteSaveContext(
      null,
      { type: "personal" },
      organization
    )).toEqual({ target: organization, opportunityId: null });
  });

  it("renders opportunity context and a back link without raw IDs in copy", () => {
    render(
      <OpportunityQuoteContext
        detail={detail}
        workspace={{ type: "organization", organizationId: "org-1", name: "Team" }}
      />
    );
    expect(screen.getByText("Creating a quote for Air conditioner repair")).toBeInTheDocument();
    expect(screen.getByText(/saved to the Team workspace/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to opportunity" })).toHaveAttribute(
      "href",
      "/opportunities/opp-1"
    );
    expect(screen.queryByText("opp-1")).not.toBeInTheDocument();
  });

  it("renders safe not-found and repository error states", () => {
    const { rerender } = render(<OpportunityPrefillError repositoryError={false} />);
    expect(screen.getByText("Opportunity not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to Opportunities" })).toHaveAttribute(
      "href",
      "/opportunities"
    );
    rerender(<OpportunityPrefillError repositoryError />);
    expect(screen.getByText("Opportunity couldn’t be loaded")).toBeInTheDocument();
  });
});
