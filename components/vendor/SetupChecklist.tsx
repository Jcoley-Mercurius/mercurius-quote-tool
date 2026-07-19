"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { hasCustomLogo } from "@/lib/vendor/logo";
import {
  OnboardingChecklist,
  type OnboardingStep,
} from "./OnboardingChecklist";
import { useVendorProfile } from "./VendorProfileProvider";

function dismissalKey(userId: string) {
  return `mercurius:setup-checklist-dismissed:${userId}`;
}

/**
 * Connected setup checklist. Completion state is derived from the real vendor
 * profile (business details, labor rate, logo) rather than demo data, and
 * dismissal persists per-user in localStorage — mirroring VendorProfileNudge.
 *
 * It renders nothing while loading, when there is no user, once required setup
 * is complete, or after the user dismisses it, so it only surfaces for
 * incomplete profiles.
 */
export function SetupChecklist({ className = "" }: { className?: string }) {
  const { user } = useAuth();
  const { profile, isLoading } = useVendorProfile();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  // Read localStorage once the user ID is available.
  useEffect(() => {
    if (!user?.id) return;
    setDismissed(localStorage.getItem(dismissalKey(user.id)) === "1");
  }, [user?.id]);

  const steps = useMemo<OnboardingStep[]>(() => {
    const profileComplete =
      profile.businessName.trim() !== "" && profile.phone.trim() !== "";
    // 95 is the untouched default; treat anything else as intentionally set.
    const laborRateSet =
      profile.laborRatePerHour > 0 && profile.laborRatePerHour !== 95;
    const logoAdded = hasCustomLogo(profile);

    return [
      {
        id: "business-profile",
        title: "Complete business profile",
        description: "Add your company details and contact information.",
        completed: profileComplete,
      },
      {
        id: "labor-rate",
        title: "Set labor rate",
        description: "Choose the default hourly rate used in your quotes.",
        completed: laborRateSet,
      },
      {
        id: "company-logo",
        title: "Add logo",
        description: "Personalize estimates with your company branding.",
        optional: true,
        completed: logoAdded,
      },
    ];
  }, [profile]);

  const allRequiredComplete = steps
    .filter((step) => !step.optional)
    .every((step) => step.completed);

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(dismissalKey(user.id), "1");
    }
    setDismissed(true);
  };

  if (isLoading || !user || dismissed || allRequiredComplete) {
    return null;
  }

  // Re-key on the derived completion signature so the checklist re-seeds when
  // the underlying vendor profile changes (e.g. after saving the form below).
  const completionSignature = steps
    .map((step) => (step.completed ? "1" : "0"))
    .join("");

  return (
    <OnboardingChecklist
      key={completionSignature}
      steps={steps}
      onDismiss={handleDismiss}
      className={className}
    />
  );
}
