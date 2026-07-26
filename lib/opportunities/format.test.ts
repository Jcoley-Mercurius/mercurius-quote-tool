import { describe, expect, it } from "vitest";
import {
  clampPage,
  formatCustomerName,
  formatOpportunityTitle,
  formatMarketplaceBudget,
  formatPropertyAddress,
  opportunityFiltersForWorkspace,
  parseMarketplaceRequestContext,
  parseOpportunityFilters,
} from "./format";
import {
  OPPORTUNITY_ORIGINS,
  OPPORTUNITY_ORIGIN_LABELS,
  OPPORTUNITY_STATUSES,
  OPPORTUNITY_STATUS_LABELS,
  OPPORTUNITY_STATUS_STYLES,
} from "./types";

describe("opportunity domain formatting", () => {
  it("defines a label and visual variant for every status", () => {
    for (const status of OPPORTUNITY_STATUSES) {
      expect(OPPORTUNITY_STATUS_LABELS[status]).toBeTruthy();
      expect(OPPORTUNITY_STATUS_STYLES[status]).toContain("text-");
    }
  });

  it("defines a label for every origin", () => {
    for (const origin of OPPORTUNITY_ORIGINS) {
      expect(OPPORTUNITY_ORIGIN_LABELS[origin]).toBeTruthy();
    }
  });

  it("uses honest customer and title fallbacks", () => {
    expect(formatCustomerName(null)).toBe("Customer details unavailable");
    expect(formatCustomerName({ display_name: "  Jordan Lee " })).toBe("Jordan Lee");
    expect(formatOpportunityTitle(" ", " HVAC ")).toBe("HVAC");
    expect(formatOpportunityTitle(null, null)).toBe("Opportunity");
  });

  it("formats partial property addresses and handles missing data", () => {
    expect(
      formatPropertyAddress({
        address_line1: "10 Palm Ave",
        address_line2: null,
        city: "Cape Coral",
        region: "FL",
        postal_code: null,
        country_code: "US",
      })
    ).toBe("10 Palm Ave · Cape Coral, FL");
    expect(formatPropertyAddress(null)).toBe("Property details unavailable");
  });

  it("validates filters and clamps pagination", () => {
    expect(
      parseOpportunityFilters({
        status: "invalid",
        origin: "marketplace",
        assignment: "unassigned",
      })
    ).toEqual({
      status: "active",
      origin: "marketplace",
      assignment: "unassigned",
    });
    expect(clampPage("-5")).toBe(1);
    expect(clampPage("3")).toBe(3);
    expect(clampPage("not-a-page")).toBe(1);
    expect(parseOpportunityFilters({ assignment: "mine" }).assignment)
      .toBe("mine");
    expect(opportunityFiltersForWorkspace(
      { status: "active", origin: "all", assignment: "mine" },
      { type: "personal" }
    )).toEqual({
      status: "active",
      origin: "all",
      assignment: "all",
    });
  });

  it("allowlists valid Marketplace request context and ignores unknown keys", () => {
    expect(parseMarketplaceRequestContext({
      assignedAt: "2026-07-20T12:00:00Z",
      serviceCategory: { code: "hvac", displayName: "HVAC", secret: "ignore" },
      requestTitle: "AC repair",
      requestDescription: "No cooling",
      preferredTiming: "Weekday morning",
      budgetRange: {
        minimumAmountMinor: 12500,
        maximumAmountMinor: 25000,
        currency: "USD",
      },
      marketplaceLeadId: "must-not-leak",
      unknown: { raw: true },
    })).toEqual({
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
    });
  });

  it("rejects malformed snapshots and formats safe budget variants", () => {
    expect(parseMarketplaceRequestContext(null)).toBeNull();
    expect(parseMarketplaceRequestContext("raw")).toBeNull();
    expect(parseMarketplaceRequestContext({ unknown: true })).toBeNull();
    expect(formatMarketplaceBudget({
      minimumAmountMinor: 12500,
      maximumAmountMinor: 25000,
      currency: "USD",
    })).toBe("$125.00–$250.00");
    expect(formatMarketplaceBudget({
      minimumAmountMinor: 12500,
      maximumAmountMinor: null,
      currency: "USD",
    })).toBe("$125.00 minimum");
    expect(formatMarketplaceBudget({
      minimumAmountMinor: null,
      maximumAmountMinor: 25000,
      currency: "USD",
    })).toBe("Up to $250.00");
    expect(formatMarketplaceBudget({
      minimumAmountMinor: 100,
      maximumAmountMinor: null,
      currency: "not currency",
    })).toBeNull();
  });
});
