import { describe, expect, it } from "vitest";
import {
  extractZipFromAddress,
  lookupProperty,
  normalizeAddress,
} from "./lookup";

describe("normalizeAddress", () => {
  it("lowercases and collapses whitespace", () => {
    expect(normalizeAddress("  1234  SE  47th   Terrace,  Cape Coral, FL  ")).toBe(
      "1234 se 47th terrace cape coral fl"
    );
  });
});

describe("extractZipFromAddress", () => {
  it("extracts a 5-digit zip from a full address", () => {
    expect(
      extractZipFromAddress("1234 SE 47th Terrace, Cape Coral, FL 33904")
    ).toBe("33904");
  });

  it("extracts zip from ZIP+4 format", () => {
    expect(extractZipFromAddress("Fort Myers, FL 33919-1234")).toBe("33919");
  });
});

describe("lookupProperty", () => {
  it("returns known assessor records for curated demo addresses", () => {
    const result = lookupProperty({
      address: "1234 SE 47th Terrace, Cape Coral, FL 33904",
    });

    expect(result).toMatchObject({
      found: true,
      matchType: "exact",
      squareFootage: 1850,
      yearBuilt: 1987,
      stories: "1",
      zipCode: "33904",
      areaName: "Cape Coral (SE)",
      source: "lee-county-assessor-mock",
      sourceLabel: "Lee County Property Records (demo)",
    });
  });

  it("returns zip-based SWFL profiles when only zip is provided", () => {
    const result = lookupProperty({ zipCode: "33904" });

    expect(result.found).toBe(true);
    expect(result.matchType).toBe("estimated");
    expect(result.zipCode).toBe("33904");
    expect(result.squareFootage).toBeGreaterThanOrEqual(1400);
    expect(result.squareFootage).toBeLessThanOrEqual(2600);
    expect(result.yearBuilt).toBeGreaterThanOrEqual(1975);
    expect(result.yearBuilt).toBeLessThanOrEqual(2005);
    expect(["1", "2", "3+"]).toContain(result.stories);
  });

  it("is deterministic for the same address input", () => {
    const input = { address: "892 Palm Tree Blvd, Cape Coral, FL 33991" };
    const first = lookupProperty(input);
    const second = lookupProperty(input);

    expect(first).toEqual(second);
    expect(first.found).toBe(true);
    expect(first.matchType).toBe("estimated");
  });

  it("falls back to zip estimate when address is unknown but SWFL zip is present", () => {
    const result = lookupProperty({
      address: "999 Unknown St, Cape Coral, FL 33904",
    });

    expect(result.found).toBe(true);
    expect(result.matchType).toBe("estimated");
    expect(result.message).toMatch(/No exact record/i);
  });

  it("returns not found for non-SWFL zip codes", () => {
    const result = lookupProperty({ zipCode: "90210" });

    expect(result.found).toBe(false);
    expect(result.message).toMatch(/SWFL/i);
  });

  it("requires address or zip", () => {
    const result = lookupProperty({});

    expect(result.found).toBe(false);
    expect(result.message).toMatch(/address or zip/i);
  });
});