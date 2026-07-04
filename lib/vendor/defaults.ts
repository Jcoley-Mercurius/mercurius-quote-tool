import type { VendorProfile } from "./types";

export const DEFAULT_VENDOR_PROFILE: VendorProfile = {
  businessName: "",
  tagline: "",
  phone: "",
  email: "",
  laborRatePerHour: 95,
  markupPercentage: 20,
  materialMarkupPercentage: 15,
  minimumJobValue: 150,
  travelFee: 45,
  includeTravelFee: false,
  quoteValidityDays: 30,
  priceRangeSpread: 12,
  logoUrl: null,
  logoDataUrl: null,
  showPoweredByMercurius: true,
};