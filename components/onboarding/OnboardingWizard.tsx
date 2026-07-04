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
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2
                id="onboarding-title"
                className="text-lg font-semibold text-slate-900"
              >
                Welcome to Mercurius
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Set up your profile in 3 quick steps.
              </p>
            </div>
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-slate-400 hover:text-slate-600"
              title="Skip onboarding"
            >
              Skip for now
            </button>
          </div>

          {/* Step indicator */}
          <div className="mt-4 flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={[
                    "flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                    i < step
                      ? "bg-mercurius-600 text-white"
                      : i === step
                        ? "bg-mercurius-100 text-mercurius-700 ring-2 ring-mercurius-400"
                        : "bg-slate-100 text-slate-400",
                  ].join(" ")}
                >
                  {i < step ? (
                    <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                      <path
                        fillRule="evenodd"
                        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={[
                    "text-xs font-medium",
                    i === step ? "text-mercurius-700" : "text-slate-400",
                  ].join(" ")}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <div
                    className={[
                      "h-px w-6 rounded",
                      i < step ? "bg-mercurius-400" : "bg-slate-200",
                    ].join(" ")}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="px-6 py-6">
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
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 0 || isSaving}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:invisible"
          >
            Back
          </button>

          {step < 2 ? (
            <button
              type="button"
              onClick={handleNext}
              className="rounded-xl bg-mercurius-600 px-5 py-2 text-sm font-semibold text-white hover:bg-mercurius-700"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleFinish()}
              disabled={isSaving}
              className="rounded-xl bg-mercurius-600 px-5 py-2 text-sm font-semibold text-white hover:bg-mercurius-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Finish setup"}
            </button>
          )}
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
    "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition-colors focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20";
  const errorClass = "border-red-300 focus:border-red-500 focus:ring-red-500/20";

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        This appears on every quote you send to clients.
      </p>

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
    "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition-colors focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20";

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        AI quote generation uses your rates instead of generic benchmarks. You
        can always fine-tune these later in Settings.
      </p>

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
      <p className="text-sm text-slate-500">
        Upload your logo to personalize PDF quotes. This step is optional — you
        can add or change it anytime in Settings.
      </p>

      <LogoUpload
        workspaceScope={workspaceScope}
        logoUrl={draft.logoUrl}
        legacyLogoDataUrl={draft.logoDataUrl}
        onChange={onLogoChange}
      />
    </div>
  );
}
