import { describe, expect, it } from "vitest";
import {
  clampPage,
  formatCustomerName,
  formatOpportunityTitle,
  formatPropertyAddress,
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
  });
});
