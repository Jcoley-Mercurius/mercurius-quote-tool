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
      className="mb-6 rounded-xl border border-mercurius-200 bg-mercurius-50 px-4 py-3 text-sm text-mercurius-900 ring-1 ring-mercurius-100"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          {/* Sparkle icon */}
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-4 w-4 shrink-0 text-mercurius-500"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.83-4.401Z"
              clipRule="evenodd"
            />
          </svg>

          <div className="min-w-0">
            <p className="font-medium leading-snug">
              Complete your business profile
            </p>
            <p className="mt-0.5 text-mercurius-800/80">
              Quotes look more professional with your business name, phone
              number, and pricing configured.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 pl-7 sm:pl-0">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 rounded-lg border border-mercurius-300 bg-white px-3 py-1.5 text-xs font-semibold text-mercurius-700 transition-colors hover:bg-mercurius-100 focus:outline-none focus:ring-2 focus:ring-mercurius-500 focus:ring-offset-1"
          >
            Complete profile
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              className="h-3 w-3"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M6.22 4.22a.75.75 0 0 1 1.06 0l3.25 3.25a.75.75 0 0 1 0 1.06l-3.25 3.25a.75.75 0 0 1-1.06-1.06L8.94 8 6.22 5.28a.75.75 0 0 1 0-1.06Z"
                clipRule="evenodd"
              />
            </svg>
          </Link>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss profile reminder"
            className="rounded-lg p-1.5 text-mercurius-500 transition-colors hover:bg-mercurius-100/80 hover:text-mercurius-700 focus:outline-none focus:ring-2 focus:ring-mercurius-500 focus:ring-offset-1"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
