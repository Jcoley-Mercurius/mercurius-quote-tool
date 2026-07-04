import { describe, expect, it } from "vitest";
import { DEFAULT_VENDOR_PROFILE } from "@/lib/vendor/defaults";
import {
  captureVendorSnapshot,
  hasVendorSnapshot,
  parseVendorSnapshot,
  resolveQuoteVendorProfile,
} from "./vendor-snapshot";
import type { SavedQuote } from "./types";

const liveProfile = {
  ...DEFAULT_VENDOR_PROFILE,
  businessName: "Live Vendor Co",
};

const savedQuote: SavedQuote = {
  id: "q-1",
  reference: "MQ-001",
  status: "draft",
  serviceType: "hvac",
  jobName: "AC install",
  form: {
    serviceType: "hvac",
    squareFootage: 2000,
    stories: 1,
    yearBuilt: 2000,
    zipCode: "33904",
    jobDescription: "Replace unit",
    photoCount: 0,
  },
  quote: {
    title: "AC Replacement",
    summary: "Summary",
    lineItems: [],
    assumptions: [],
    notes: [],
    alerts: [],
    generatedAt: "2026-06-20T12:00:00.000Z",
  },
  source: "ai",
  createdAt: "2026-06-20T12:00:00.000Z",
  updatedAt: "2026-06-20T12:00:00.000Z",
};

describe("vendor snapshot helpers", () => {
  it("captures a copy of the vendor profile", () => {
    const snapshot = captureVendorSnapshot(liveProfile);
    expect(snapshot).toEqual(liveProfile);
    expect(snapshot).not.toBe(liveProfile);
  });

  it("resolves snapshot over live profile when present", () => {
    const snapshot = captureVendorSnapshot({
      ...liveProfile,
      businessName: "Frozen Vendor Co",
    });

    expect(
      resolveQuoteVendorProfile({ ...savedQuote, vendorSnapshot: snapshot }, liveProfile)
        .businessName
    ).toBe("Frozen Vendor Co");
  });

  it("falls back to live profile when snapshot is missing", () => {
    expect(resolveQuoteVendorProfile(savedQuote, liveProfile).businessName).toBe(
      "Live Vendor Co"
    );
  });

  it("detects stored snapshots", () => {
    expect(hasVendorSnapshot(savedQuote)).toBe(false);
    expect(
      hasVendorSnapshot({
        ...savedQuote,
        vendorSnapshot: captureVendorSnapshot(liveProfile),
      })
    ).toBe(true);
  });

  it("parses valid snapshot JSON", () => {
    expect(parseVendorSnapshot(liveProfile)?.businessName).toBe("Live Vendor Co");
    expect(parseVendorSnapshot({})).toBeNull();
  });
});