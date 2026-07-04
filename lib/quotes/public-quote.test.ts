import { describe, expect, it } from "vitest";
import { rowToPublicQuote, type PublicQuoteRow } from "./public-quote";

const baseRow: PublicQuoteRow = {
  id: "q-1",
  reference: "MQ-001",
  status: "sent",
  service_type: "roofing",
  job_name: "Smith Residence",
  form_data: {
    serviceType: "roofing",
    zipCode: "33901",
    squareFootage: "2000",
    stories: "1",
    yearBuilt: "1990",
    jobDescription: "Full roof replacement",
    photoCount: 0,
  },
  quote_data: {
    title: "Roof replacement estimate",
    propertyContext: "Single-story home",
    lineItems: [],
    assumptions: ["Includes tear-off"],
    notes: ["30-day validity"],
    validityDays: 30,
    generatedAt: "2026-06-01T12:00:00.000Z",
  },
  source: "ai",
  vendor_snapshot: {
    businessName: "Acme Roofing",
    tagline: "Quality roofs",
    email: "info@acme.test",
    phone: "555-0100",
    logoUrl: null,
    showPoweredByMercurius: true,
  },
  created_at: "2026-06-01T10:00:00.000Z",
  updated_at: "2026-06-01T12:00:00.000Z",
};

describe("rowToPublicQuote", () => {
  it("maps database row fields to public payload", () => {
    const payload = rowToPublicQuote(baseRow);

    expect(payload.id).toBe("q-1");
    expect(payload.reference).toBe("MQ-001");
    expect(payload.jobName).toBe("Smith Residence");
    expect(payload.vendorProfile?.businessName).toBe("Acme Roofing");
    expect(payload.isDraftPreview).toBe(false);
  });

  it("flags draft quotes as preview", () => {
    const payload = rowToPublicQuote({ ...baseRow, status: "draft" });
    expect(payload.isDraftPreview).toBe(true);
  });
});