import { DEFAULT_VENDOR_PROFILE } from "./defaults";
import type { VendorProfile } from "./types";

const STORAGE_KEY = "mercurius-vendor-profile";

export function loadVendorProfile(): VendorProfile {
  if (typeof window === "undefined") return DEFAULT_VENDOR_PROFILE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VENDOR_PROFILE;
    const parsed = JSON.parse(raw) as Partial<VendorProfile>;
    return { ...DEFAULT_VENDOR_PROFILE, ...parsed };
  } catch {
    return DEFAULT_VENDOR_PROFILE;
  }
}

export function saveVendorProfile(profile: VendorProfile): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export { getLogoUrl, getVendorLogoSrc, hasCustomLogo } from "./logo";