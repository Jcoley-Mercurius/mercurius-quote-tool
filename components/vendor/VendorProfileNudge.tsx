"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useVendorProfile } from "./VendorProfileProvider";

/** Returns true when the vendor profile is missing enough info to matter */
function isProfileIncomplete(profile: {
  businessName: string;
  phone: string;
  laborRatePerHour: number;
}): boolean {
  return (
    profile.businessName.trim() === "" ||
    profile.phone.trim() === "" ||
    profile.laborRatePerHour === 95 // untouched default
  );
}

function dismissalKey(userId: string) {
  return `mercurius:profile-nudge-dismissed:${userId}`;
}

/**
 * A small, dismissible banner that prompts contractors with incomplete vendor
 * profiles to fill in their business details before sending quotes.
 *
 * Dismissal is stored in localStorage keyed by user ID so it persists across
 * sessions but resets automatically if the user signs in on a new device.
 *
 * The banner is invisible until we're certain:
 *   1. The vendor profile is loaded (isLoading = false)
 *   2. The profile is actually incomplete
 *   3. The user hasn't dismissed it yet
 */
export function VendorProfileNudge() {
  const { user } = useAuth();
  const { profile, isLoading } = useVendorProfile();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  // Read localStorage once the user ID is available
  useEffect(() => {
    if (!user?.id) return;
    const key = dismissalKey(user.id);
    const alreadyDismissed = localStorage.getItem(key) === "1";
    setDismissed(alreadyDismissed);
  }, [user?.id]);

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(dismissalKey(user.id), "1");
    }
    setDismissed(true);
  };

  // Don't render while loading, profile is complete, or already dismissed
  if (isLoading || !user || dismissed || !isProfileIncomplete(profile)) {
    return null;
  }

  return (
    <div
      role="alert"
      className="mb-6 flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 p-4 shadow-sm ring-1 ring-amber-100"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
        <svg className="h-4 w-4 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-amber-900">
          Complete your business profile
        </p>
        <p className="mt-0.5 text-sm text-amber-800/80">
          Your business name, phone, and labor rate appear on every quote.
          Clients trust complete profiles.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-700"
          >
            Complete profile →
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs font-medium text-amber-700/60 transition-colors hover:text-amber-700"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
