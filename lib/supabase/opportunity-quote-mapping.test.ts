import { describe, expect, it } from "vitest";
import type { SavedQuote } from "@/lib/quotes/types";
import {
  rowToSavedQuote,
  savedQuoteToRow,
  type QuoteRow,
} from "./types";

const savedQuote: SavedQuote = {
  id: "quote-1",
  reference: "MQ-1001",
  status: "draft",
  serviceType: "hvac",
  jobName: "AC repair",
  form: {
    serviceType: "hvac",
    squareFootage: "",
    stories: "",
    yearBuilt: "",
    zipCode: "33904",
    jobDescription: "Repair AC",
    photoCount: 0,
  },
  quote: {
    title: "AC repair",
    propertyContext: "Cape Coral",
    lineItems: [],
    assumptions: [],
    notes: [],
    alerts: [],
    validityDays: 30,
    generatedAt: "2026-07-20T12:00:00Z",
  },
  source: "ai",
  organizationId: "org-1",
  opportunityId: "opp-1",
  createdAt: "2026-07-20T12:00:00Z",
  updatedAt: "2026-07-20T12:00:00Z",
};

describe("opportunity quote persistence mapping", () => {
  it("maps SavedQuote opportunityId to the database row", () => {
    expect(savedQuoteToRow("user-1", savedQuote).opportunity_id).toBe("opp-1");
    expect(savedQuoteToRow("user-1", {
      ...savedQuote,
      opportunityId: null,
    }).opportunity_id).toBeNull();
    expect(savedQuoteToRow("user-1", {
      ...savedQuote,
      opportunityId: undefined,
    }).opportunity_id).toBeNull();
  });

  it("maps database opportunity_id to SavedQuote and accepts null legacy rows", () => {
    const row = {
      ...savedQuoteToRow("user-1", savedQuote),
      created_at: savedQuote.createdAt,
      updated_at: savedQuote.updatedAt,
    } satisfies QuoteRow;
    expect(rowToSavedQuote(row).opportunityId).toBe("opp-1");
    expect(rowToSavedQuote({ ...row, opportunity_id: null }).opportunityId).toBeNull();
  });

  it("preserves linkage when an edited quote is written again", () => {
    const edited: SavedQuote = {
      ...savedQuote,
      form: { ...savedQuote.form, jobDescription: "Updated repair scope" },
      updatedAt: "2026-07-21T12:00:00Z",
    };
    expect(savedQuoteToRow("user-1", edited).opportunity_id).toBe("opp-1");
  });
});
