import { describe, expect, it } from "vitest";
import type { OpportunityDetail } from "./types";
import {
  mapOpportunityServiceType,
  opportunityToQuoteFormData,
} from "./to-quote-form";

const opportunity: OpportunityDetail = {
  id: "opp-1",
  title: "Air conditioner repair",
  serviceType: "hvac",
  origin: "marketplace",
  status: "new",
  description: "The downstairs system is not cooling.",
  assignedUserId: null,
  customer: null,
  property: {
    id: "property-1",
    addressLine1: "10 Palm Ave",
    addressLine2: "Unit 2",
    city: "Cape Coral",
    region: "FL",
    postalCode: "33904",
    countryCode: "US",
  },
  marketplaceContext: {
    assignedAt: null,
    serviceCategory: null,
    requestTitle: null,
    requestDescription: null,
    preferredTiming: null,
    budgetRange: {
      minimumAmountMinor: 10000,
      maximumAmountMinor: 20000,
      currency: "USD",
    },
  },
  openedAt: null,
  declinedAt: null,
  closedAt: null,
  createdAt: "2026-07-20T12:00:00Z",
  updatedAt: "2026-07-20T12:00:00Z",
};

describe("opportunityToQuoteFormData", () => {
  it("maps only explicit supported service values", () => {
    expect(mapOpportunityServiceType("HVAC")).toBe("hvac");
    expect(mapOpportunityServiceType("air conditioning")).toBe("");
    expect(mapOpportunityServiceType("hvac-repair")).toBe("");
  });

  it("prefills description, complete address, and postal code", () => {
    expect(opportunityToQuoteFormData(opportunity)).toEqual({
      serviceType: "hvac",
      propertyAddress: "10 Palm Ave, Unit 2 · Cape Coral, FL",
      squareFootage: "",
      stories: "",
      yearBuilt: "",
      zipCode: "33904",
      jobDescription: "The downstairs system is not cooling.",
      photos: [],
    });
  });

  it("uses the title when description is missing", () => {
    expect(opportunityToQuoteFormData({
      ...opportunity,
      description: null,
    }).jobDescription).toBe("Air conditioner repair");
  });

  it("handles partial and missing properties without fabrication", () => {
    expect(opportunityToQuoteFormData({
      ...opportunity,
      property: { ...opportunity.property!, addressLine1: null, addressLine2: null },
    }).propertyAddress).toBe("Cape Coral, FL");
    expect(opportunityToQuoteFormData({
      ...opportunity,
      property: null,
    })).toMatchObject({ propertyAddress: "", zipCode: "", photos: [] });
  });

  it("does not copy Marketplace budget or raw snapshot context into pricing or text", () => {
    const result = opportunityToQuoteFormData(opportunity);
    expect(JSON.stringify(result)).not.toContain("10000");
    expect(JSON.stringify(result)).not.toContain("budgetRange");
    expect(result.squareFootage).toBe("");
  });
});
