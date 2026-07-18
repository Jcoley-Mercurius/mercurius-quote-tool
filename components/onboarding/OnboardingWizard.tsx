"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useVendorProfile } from "@/components/vendor/VendorProfileProvider";
import { LogoUpload } from "@/components/vendor/LogoUpload";
import { toastPromise } from "@/lib/ui/toast";
import type { VendorProfile } from "@/lib/vendor/types";

// ─── Onboarding gate helpers ──────────────────────────────────────────────────

function onboardingKey(userId: string) {
  return `mercurius_onboarding_done_v1_${userId}`;
}

function markOnboardingDone(userId: string) {
  try {
    localStorage.setItem(onboardingKey(userId), "1");
  } catch {
    // Private-browsing or storage-full — silently ignore
  }
}

function isOnboardingDone(userId: string): boolean {
  try {
    return localStorage.getItem(onboardingKey(userId)) === "1";
  } catch {
    return false;
  }
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const { user } = useAuth();
  const {
    profile,
    saveProfile,
    workspaceScope,
    isLoading,
  } = useVendorProfile();

  // Local dismissed flag so Skip works instantly without a page refresh
  const [dismissed, setDismissed] = useState(false);

  // Don't render anything while auth / profile is still hydrating
  if (isLoading || !user) return null;

  // Profile already has business name → user is onboarded
  if (profile.businessName.trim()) return null;

  // User explicitly dismissed/completed wizard previously (persisted or local)
  if (dismissed || isOnboardingDone(user.id)) return null;

  return (
    <WizardModal
      profile={profile}
      saveProfile={saveProfile}
      workspaceScope={workspaceScope}
      onDismiss={() => {
        markOnboardingDone(user.id);
        setDismissed(true);
      }}
    />
  );
}

// ─── Modal shell ─────────────────────────────────────────────────────────────

const STEPS = ["Business Info", "Pricing", "Branding"] as const;
type Step = 0 | 1 | 2;

interface WizardModalProps {
  profile: VendorProfile;
  saveProfile: (p: VendorProfile) => Promise<void>;
  workspaceScope: import("@/lib/organizations/types").Workspace;
  onDismiss: () => void;
}

function WizardModal({
  profile,
  saveProfile,
  workspaceScope,
  onDismiss,
}: WizardModalProps) {
  const [step, setStep] = useState<Step>(0);
  const [draft, setDraft] = useState<VendorProfile>(profile);
  const [errors, setErrors] = useState<{ businessName?: string; phone?: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const update = <K extends keyof VendorProfile>(key: K, value: VendorProfile[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (key in errors) {
      setErrors((prev) => {
        const next = { ...prev };
        delete (next as Record<string, string>)[key as string];
        return next;
      });
    }
  };

  const validateStep0 = () => {
    const nextErrors: typeof errors = {};
    if (!draft.businessName.trim()) nextErrors.businessName = "Business name is required.";
    if (!draft.phone.trim()) nextErrors.phone = "Phone number is required.";
    return nextErrors;
  };

  const handleNext = () => {
    if (step === 0) {
      const errs = validateStep0();
      if (Object.keys(errs).length > 0) {
        setErrors(errs);
        return;
      }
    }
    setStep((s) => Math.min(s + 1, 2) as Step);
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 0) as Step);

  const handleFinish = async () => {
    setIsSaving(true);
    try {
      await toastPromise(saveProfile(draft), {
        loading: "Saving your profile...",
        success: "Profile saved — let's build your first quote!",
        error: "Could not save profile. Please try again.",
      });
      onDismiss();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = () => {
    onDismiss();
  };

  const handleLogoChange = (url: string | null) => {
    setDraft((prev) => ({
      ...prev,
      logoUrl: url,
      logoDataUrl: url ? null : prev.logoDataUrl,
    }));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Set up your business profile"
      className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Step indicator */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 pb-5 pt-6">
          <div className="flex items-center gap-3">
            {STEPS.map((label, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <div key={label} className="flex items-center gap-2">
                  {i > 0 && (
                    <div
                      className={[
                        "h-px w-6 transition-colors",
                        done ? "bg-emerald-400" : "bg-slate-200",
                      ].join(" ")}
                    />
                  )}
                  <div
                    className={[
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all",
                      active
                        ? "bg-emerald-600 text-white shadow-sm shadow-emerald-200"
                        : done
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-400",
                    ].join(" ")}
                  >
                    {done ? (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      String(i + 1)
                    )}
                  </div>
                  <span
                    className={[
                      "hidden text-xs font-medium sm:inline",
                      active
                        ? "text-slate-900"
                        : done
                          ? "text-emerald-700"
                          : "text-slate-400",
                    ].join(" ")}
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Skip setup"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Step content */}
        <div className="px-6 py-6 space-y-5">
          {step === 0 && (
            <StepBusinessInfo
              draft={draft}
              errors={errors}
              update={update}
            />
          )}
          {step === 1 && (
            <StepPricing draft={draft} update={update} />
          )}
          {step === 2 && (
            <StepBranding
              draft={draft}
              workspaceScope={workspaceScope}
              onLogoChange={handleLogoChange}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
          <p className="text-xs text-slate-400">
            Step {step + 1} of {STEPS.length}
          </p>

          <div className="flex items-center gap-4">
            {step > 0 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={isSaving}
                className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600 disabled:opacity-50"
              >
                Back
              </button>
            )}

            {step < 2 ? (
              <button
                type="button"
                onClick={handleNext}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleFinish()}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Finish Setup →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Step 1: Business Info ────────────────────────────────────────────────────

function StepBusinessInfo({
  draft,
  errors,
  update,
}: {
  draft: VendorProfile;
  errors: { businessName?: string; phone?: string };
  update: <K extends keyof VendorProfile>(key: K, value: VendorProfile[K]) => void;
}) {
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition duration-150";
  const errorClass = "border-red-300 focus:border-red-500 focus:ring-red-500/20";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Let&apos;s set up your business profile
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          This info appears on every quote you send to clients. Takes 60 seconds.
        </p>
      </div>

      <div>
        <label
          htmlFor="wiz-business-name"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Business name <span className="text-red-500">*</span>
        </label>
        <input
          id="wiz-business-name"
          type="text"
          placeholder="e.g. Gulf Coast HVAC & Pool"
          value={draft.businessName}
          onChange={(e) => update("businessName", e.target.value)}
          className={[inputClass, errors.businessName ? errorClass : ""].join(" ")}
          autoFocus
        />
        {errors.businessName && (
          <p className="mt-1 text-xs text-red-600">{errors.businessName}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="wiz-phone"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Phone number <span className="text-red-500">*</span>
        </label>
        <input
          id="wiz-phone"
          type="tel"
          placeholder="(239) 555-0100"
          value={draft.phone}
          onChange={(e) => update("phone", e.target.value)}
          className={[inputClass, errors.phone ? errorClass : ""].join(" ")}
        />
        {errors.phone && (
          <p className="mt-1 text-xs text-red-600">{errors.phone}</p>
        )}
      </div>
    </div>
  );
}

// ─── Step 2: Pricing ──────────────────────────────────────────────────────────

function StepPricing({
  draft,
  update,
}: {
  draft: VendorProfile;
  update: <K extends keyof VendorProfile>(key: K, value: VendorProfile[K]) => void;
}) {
  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition duration-150";

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Set your labor rate
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          We use this to calculate accurate estimates. You can change it anytime
          in Settings.
        </p>
      </div>

      <div>
        <label
          htmlFor="wiz-labor-rate"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Labor rate (per hour)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            $
          </span>
          <input
            id="wiz-labor-rate"
            type="number"
            min={25}
            max={500}
            value={draft.laborRatePerHour}
            onChange={(e) =>
              update("laborRatePerHour", Number(e.target.value) || 0)
            }
            className={inputClass + " pl-7"}
          />
        </div>
        <p className="mt-1 text-xs text-slate-400">
          SWFL average: $75–$140/hr depending on trade
        </p>
      </div>

      <div>
        <label
          htmlFor="wiz-markup"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          General markup
        </label>
        <div className="relative">
          <input
            id="wiz-markup"
            type="number"
            min={0}
            max={100}
            value={draft.markupPercentage}
            onChange={(e) =>
              update("markupPercentage", Number(e.target.value) || 0)
            }
            className={inputClass + " pr-8"}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
            %
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Branding ─────────────────────────────────────────────────────────

function StepBranding({
  draft,
  workspaceScope,
  onLogoChange,
}: {
  draft: VendorProfile;
  workspaceScope: import("@/lib/organizations/types").Workspace;
  onLogoChange: (url: string | null) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">
          Add your logo (optional)
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Your logo appears on client quotes and the portal. Builds trust
          instantly.
        </p>
      </div>

      <LogoUpload
        workspaceScope={workspaceScope}
        logoUrl={draft.logoUrl}
        legacyLogoDataUrl={draft.logoDataUrl}
        onChange={onLogoChange}
      />
    </div>
  );
}
