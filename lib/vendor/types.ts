/** Vendor pricing & branding profile (persisted in Supabase) */

export interface VendorProfile {
  // Business identity
  businessName: string;
  tagline: string;
  phone: string;
  email: string;

  // Pricing preferences
  laborRatePerHour: number;
  markupPercentage: number;
  materialMarkupPercentage: number;
  minimumJobValue: number;
  travelFee: number;
  includeTravelFee: boolean;
  quoteValidityDays: number;
  priceRangeSpread: number;

  // Branding
  /** Public Supabase Storage URL for the vendor logo */
  logoUrl: string | null;
  /** Legacy base64 logo — kept for backward compatibility during migration */
  logoDataUrl: string | null;
  showPoweredByMercurius: boolean;
}

/** Pricing fields sent to the AI API (no logo) */
export type VendorPricingSettings = Pick<
  VendorProfile,
  | "businessName"
  | "laborRatePerHour"
  | "markupPercentage"
  | "materialMarkupPercentage"
  | "minimumJobValue"
  | "travelFee"
  | "includeTravelFee"
  | "quoteValidityDays"
  | "priceRangeSpread"
>;

export function toPricingSettings(profile: VendorProfile): VendorPricingSettings {
  return {
    businessName: profile.businessName,
    laborRatePerHour: profile.laborRatePerHour,
    markupPercentage: profile.markupPercentage,
    materialMarkupPercentage: profile.materialMarkupPercentage,
    minimumJobValue: profile.minimumJobValue,
    travelFee: profile.travelFee,
    includeTravelFee: profile.includeTravelFee,
    quoteValidityDays: profile.quoteValidityDays,
    priceRangeSpread: profile.priceRangeSpread,
  };
}