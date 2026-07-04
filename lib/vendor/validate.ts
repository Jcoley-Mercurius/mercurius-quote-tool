import type { VendorProfile } from "./types";

export type VendorProfileErrors = Partial<Record<keyof VendorProfile, string>>;

export function validateVendorProfile(
  profile: VendorProfile
): VendorProfileErrors {
  const errors: VendorProfileErrors = {};

  if (!profile.businessName.trim()) {
    errors.businessName = "Business name is required.";
  }

  if (profile.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) {
    errors.email = "Enter a valid email address.";
  }

  if (profile.laborRatePerHour <= 0) {
    errors.laborRatePerHour = "Labor rate must be a positive number.";
  } else if (profile.laborRatePerHour < 25 || profile.laborRatePerHour > 500) {
    errors.laborRatePerHour = "Labor rate must be between $25 and $500/hr.";
  }

  if (profile.markupPercentage < 0 || profile.markupPercentage > 100) {
    errors.markupPercentage = "Markup must be between 0% and 100%.";
  }

  if (
    profile.materialMarkupPercentage < 0 ||
    profile.materialMarkupPercentage > 100
  ) {
    errors.materialMarkupPercentage =
      "Materials markup must be between 0% and 100%.";
  }

  if (profile.minimumJobValue <= 0) {
    errors.minimumJobValue = "Minimum job value must be a positive number.";
  } else if (profile.minimumJobValue > 10000) {
    errors.minimumJobValue = "Minimum job value must be $10,000 or less.";
  }

  if (profile.travelFee < 0) {
    errors.travelFee = "Travel fee cannot be negative.";
  } else if (profile.travelFee > 500) {
    errors.travelFee = "Travel fee must be $500 or less.";
  }

  if (profile.priceRangeSpread < 5 || profile.priceRangeSpread > 30) {
    errors.priceRangeSpread = "Price range spread must be between 5% and 30%.";
  }

  if (profile.quoteValidityDays < 7 || profile.quoteValidityDays > 90) {
    errors.quoteValidityDays = "Quote validity must be between 7 and 90 days.";
  }

  return errors;
}