import type { VendorProfile } from "./types";

/** Resolve the best logo source for display (Storage URL → legacy base64 → default). */
export function getVendorLogoSrc(
  profile: Pick<VendorProfile, "logoUrl" | "logoDataUrl">
): string | null {
  if (profile.logoUrl) return profile.logoUrl;
  if (profile.logoDataUrl) return profile.logoDataUrl;
  return null;
}

/** Logo URL for PDF export and other contexts that require a non-null image src. */
export function getLogoUrl(
  profile: Pick<VendorProfile, "logoUrl" | "logoDataUrl">,
  origin?: string
): string {
  const custom = getVendorLogoSrc(profile);
  if (custom) return custom;

  const base =
    origin ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${base}/mercurius-logo.png`;
}

export function hasCustomLogo(
  profile: Pick<VendorProfile, "logoUrl" | "logoDataUrl">
): boolean {
  return Boolean(profile.logoUrl || profile.logoDataUrl);
}