import type { VendorProfile } from "@/lib/vendor/types";
import type { SavedQuote } from "./types";

export function captureVendorSnapshot(profile: VendorProfile): VendorProfile {
  return { ...profile };
}

export function hasVendorSnapshot(quote: SavedQuote): boolean {
  return quote.vendorSnapshot != null;
}

export function resolveQuoteVendorProfile(
  quote: SavedQuote,
  liveProfile: VendorProfile
): VendorProfile {
  return quote.vendorSnapshot ?? liveProfile;
}

export function parseVendorSnapshot(value: unknown): VendorProfile | null {
  if (!value || typeof value !== "object") return null;

  const candidate = value as Partial<VendorProfile>;
  if (typeof candidate.businessName !== "string") return null;

  return {
    businessName: candidate.businessName,
    tagline: typeof candidate.tagline === "string" ? candidate.tagline : "",
    phone: typeof candidate.phone === "string" ? candidate.phone : "",
    email: typeof candidate.email === "string" ? candidate.email : "",
    laborRatePerHour: Number(candidate.laborRatePerHour) || 0,
    markupPercentage: Number(candidate.markupPercentage) || 0,
    materialMarkupPercentage: Number(candidate.materialMarkupPercentage) || 0,
    minimumJobValue: Number(candidate.minimumJobValue) || 0,
    travelFee: Number(candidate.travelFee) || 0,
    includeTravelFee: Boolean(candidate.includeTravelFee),
    quoteValidityDays: Number(candidate.quoteValidityDays) || 30,
    priceRangeSpread: Number(candidate.priceRangeSpread) || 12,
    logoUrl:
      typeof candidate.logoUrl === "string" || candidate.logoUrl === null
        ? candidate.logoUrl
        : null,
    logoDataUrl:
      typeof candidate.logoDataUrl === "string" || candidate.logoDataUrl === null
        ? candidate.logoDataUrl
        : null,
    showPoweredByMercurius:
      candidate.showPoweredByMercurius !== undefined
        ? Boolean(candidate.showPoweredByMercurius)
        : true,
  };
}