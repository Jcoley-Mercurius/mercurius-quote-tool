import { describe, expect, it } from "vitest";
import { DEFAULT_VENDOR_PROFILE } from "./defaults";
import { validateVendorProfile } from "./validate";
import type { VendorProfile } from "./types";

function validProfile(overrides: Partial<VendorProfile> = {}): VendorProfile {
  return {
    ...DEFAULT_VENDOR_PROFILE,
    businessName: "Gulf Coast HVAC",
    ...overrides,
  };
}

describe("validateVendorProfile pricing fields", () => {
  it("accepts a fully valid profile", () => {
    expect(validateVendorProfile(validProfile())).toEqual({});
  });

  describe("labor rate", () => {
    it("rejects zero and negative values", () => {
      expect(validateVendorProfile(validProfile({ laborRatePerHour: 0 })))
        .toMatchObject({ laborRatePerHour: "Labor rate must be a positive number." });

      expect(validateVendorProfile(validProfile({ laborRatePerHour: -10 })))
        .toMatchObject({ laborRatePerHour: "Labor rate must be a positive number." });
    });

    it("rejects values outside the $25–$500 range", () => {
      expect(validateVendorProfile(validProfile({ laborRatePerHour: 24 })))
        .toMatchObject({ laborRatePerHour: "Labor rate must be between $25 and $500/hr." });

      expect(validateVendorProfile(validProfile({ laborRatePerHour: 501 })))
        .toMatchObject({ laborRatePerHour: "Labor rate must be between $25 and $500/hr." });
    });
  });

  describe("materials markup", () => {
    it("rejects values below 0% and above 100%", () => {
      expect(validateVendorProfile(validProfile({ materialMarkupPercentage: -1 })))
        .toMatchObject({
          materialMarkupPercentage: "Materials markup must be between 0% and 100%.",
        });

      expect(validateVendorProfile(validProfile({ materialMarkupPercentage: 101 })))
        .toMatchObject({
          materialMarkupPercentage: "Materials markup must be between 0% and 100%.",
        });
    });

    it("accepts boundary values 0% and 100%", () => {
      expect(
        validateVendorProfile(validProfile({ materialMarkupPercentage: 0 }))
      ).not.toHaveProperty("materialMarkupPercentage");

      expect(
        validateVendorProfile(validProfile({ materialMarkupPercentage: 100 }))
      ).not.toHaveProperty("materialMarkupPercentage");
    });
  });

  describe("travel fee", () => {
    it("rejects negative fees", () => {
      expect(validateVendorProfile(validProfile({ travelFee: -1 }))).toMatchObject({
        travelFee: "Travel fee cannot be negative.",
      });
    });

    it("rejects fees above $500", () => {
      expect(validateVendorProfile(validProfile({ travelFee: 501 }))).toMatchObject({
        travelFee: "Travel fee must be $500 or less.",
      });
    });

    it("accepts $0 and $500", () => {
      expect(validateVendorProfile(validProfile({ travelFee: 0 }))).not.toHaveProperty(
        "travelFee"
      );

      expect(validateVendorProfile(validProfile({ travelFee: 500 }))).not.toHaveProperty(
        "travelFee"
      );
    });
  });

  describe("minimum job value", () => {
    it("rejects zero and negative values", () => {
      expect(validateVendorProfile(validProfile({ minimumJobValue: 0 }))).toMatchObject({
        minimumJobValue: "Minimum job value must be a positive number.",
      });

      expect(validateVendorProfile(validProfile({ minimumJobValue: -50 }))).toMatchObject({
        minimumJobValue: "Minimum job value must be a positive number.",
      });
    });

    it("rejects values above $10,000", () => {
      expect(validateVendorProfile(validProfile({ minimumJobValue: 10001 }))).toMatchObject({
        minimumJobValue: "Minimum job value must be $10,000 or less.",
      });
    });
  });

  describe("price range spread", () => {
    it("rejects values outside 5–30%", () => {
      expect(validateVendorProfile(validProfile({ priceRangeSpread: 4 }))).toMatchObject({
        priceRangeSpread: "Price range spread must be between 5% and 30%.",
      });

      expect(validateVendorProfile(validProfile({ priceRangeSpread: 31 }))).toMatchObject({
        priceRangeSpread: "Price range spread must be between 5% and 30%.",
      });
    });

    it("accepts boundary values 5% and 30%", () => {
      expect(
        validateVendorProfile(validProfile({ priceRangeSpread: 5 }))
      ).not.toHaveProperty("priceRangeSpread");

      expect(
        validateVendorProfile(validProfile({ priceRangeSpread: 30 }))
      ).not.toHaveProperty("priceRangeSpread");
    });
  });

  describe("quote validity", () => {
    it("rejects values outside 7–90 days", () => {
      expect(validateVendorProfile(validProfile({ quoteValidityDays: 6 }))).toMatchObject({
        quoteValidityDays: "Quote validity must be between 7 and 90 days.",
      });

      expect(validateVendorProfile(validProfile({ quoteValidityDays: 91 }))).toMatchObject({
        quoteValidityDays: "Quote validity must be between 7 and 90 days.",
      });
    });

    it("accepts boundary values 7 and 90 days", () => {
      expect(
        validateVendorProfile(validProfile({ quoteValidityDays: 7 }))
      ).not.toHaveProperty("quoteValidityDays");

      expect(
        validateVendorProfile(validProfile({ quoteValidityDays: 90 }))
      ).not.toHaveProperty("quoteValidityDays");
    });
  });
});