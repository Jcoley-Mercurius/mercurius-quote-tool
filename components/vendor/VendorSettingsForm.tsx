"use client";

import { useState } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { toastPromise } from "@/lib/ui/toast";
import { toastValidationErrors } from "@/lib/validation/toast";
import { DEFAULT_VENDOR_PROFILE } from "@/lib/vendor/defaults";
import {
  validateVendorProfile,
  type VendorProfileErrors,
} from "@/lib/vendor/validate";
import { workspaceKey, type Workspace } from "@/lib/organizations/types";
import { useVendorProfile } from "./VendorProfileProvider";
import { LogoUpload } from "./LogoUpload";
import type { VendorProfile } from "@/lib/vendor/types";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition duration-150 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100";

const inputErrorClass =
  "border-red-300 focus:border-red-500 focus:ring-red-500/20";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

function fieldInputClass(hasError: boolean, extra = ""): string {
  return [inputClass, extra, hasError ? inputErrorClass : ""]
    .filter(Boolean)
    .join(" ");
}

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
      <div className="mt-6">{children}</div>
    </section>
  );
}

export function VendorSettingsForm() {
  const {
    profile,
    saveProfile,
    resetProfile,
    isLoading,
    workspaceScope,
    workspaceLabel,
    isOrganizationProfile,
  } = useVendorProfile();

  if (isLoading) {
    return <LoadingState message="Loading settings..." />;
  }

  return (
    <VendorSettingsFormContent
      key={workspaceKey(workspaceScope)}
      profile={profile}
      saveProfile={saveProfile}
      resetProfile={resetProfile}
      workspaceScope={workspaceScope}
      workspaceLabel={workspaceLabel}
      isOrganizationProfile={isOrganizationProfile}
    />
  );
}

function VendorSettingsFormContent({
  profile,
  saveProfile,
  resetProfile,
  workspaceScope,
  workspaceLabel,
  isOrganizationProfile,
}: {
  profile: VendorProfile;
  saveProfile: (profile: VendorProfile) => Promise<void>;
  resetProfile: () => Promise<void>;
  workspaceScope: Workspace;
  workspaceLabel: string;
  isOrganizationProfile: boolean;
}) {
  const [draft, setDraft] = useState<VendorProfile>(profile);
  const [errors, setErrors] = useState<VendorProfileErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  const update = <K extends keyof VendorProfile>(key: K, value: VendorProfile[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSave = async () => {
    const validationErrors = validateVendorProfile(draft);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toastValidationErrors(validationErrors);
      const firstErrorField = document.querySelector("[data-error='true']");
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSaving(true);
    try {
      await toastPromise(saveProfile(draft), {
        loading: "Saving profile...",
        success: "Profile saved successfully.",
        error: "Could not save profile. Please try again.",
      });
      setErrors({});
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoChange = async (url: string | null) => {
    const next: VendorProfile = {
      ...draft,
      logoUrl: url,
      logoDataUrl: url ? null : draft.logoDataUrl,
    };
    setDraft(next);
    try {
      await toastPromise(saveProfile(next), {
        loading: url ? "Saving logo..." : "Removing logo...",
        success: url ? "Logo uploaded successfully." : "Logo removed.",
        error: "Could not update logo. Please try again.",
      });
    } catch {
      setDraft(profile);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Vendor Profile
          </h1>
          <span
            className={[
              "rounded-full px-3 py-1 text-xs font-semibold",
              isOrganizationProfile
                ? "bg-mercurius-50 text-mercurius-700"
                : "bg-slate-100 text-slate-600",
            ].join(" ")}
          >
            {workspaceLabel}
          </span>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {isOrganizationProfile ? (
            <>
              Shared pricing and branding for{" "}
              <span className="font-medium">{workspaceLabel}</span>. Changes
              apply to all team members and organization quotes.
            </>
          ) : (
            <>
              Your personal pricing and branding. AI quotes and PDF exports in
              your personal workspace use these settings.
            </>
          )}
        </p>
      </div>

      <SettingsSection
        title="Business Information"
        description="Your company details appear on exported PDF quotes."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="businessName" className={labelClass}>
              Business name
            </label>
            <input
              id="businessName"
              type="text"
              placeholder="e.g. Gulf Coast HVAC & Pool"
              value={draft.businessName}
              onChange={(e) => update("businessName", e.target.value)}
              className={fieldInputClass(Boolean(errors.businessName))}
              data-error={errors.businessName ? "true" : undefined}
            />
            {errors.businessName && (
              <p className="mt-1 text-xs text-red-600">{errors.businessName}</p>
            )}
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="tagline" className={labelClass}>
              Tagline
            </label>
            <input
              id="tagline"
              type="text"
              placeholder="e.g. Licensed & Insured · Serving Cape Coral since 2005"
              value={draft.tagline}
              onChange={(e) => update("tagline", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="phone" className={labelClass}>
              Phone
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="(239) 555-0100"
              value={draft.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="quotes@yourbusiness.com"
              value={draft.email}
              onChange={(e) => update("email", e.target.value)}
              className={fieldInputClass(Boolean(errors.email))}
              data-error={errors.email ? "true" : undefined}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-600">{errors.email}</p>
            )}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Pricing Preferences"
        description="AI quote generation uses these rates instead of generic Lee County benchmarks."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="laborRate" className={labelClass}>
              Labor rate (per hour)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                $
              </span>
              <input
                id="laborRate"
                type="number"
                min={25}
                max={500}
                value={draft.laborRatePerHour}
                onChange={(e) =>
                  update("laborRatePerHour", Number(e.target.value) || 0)
                }
                className={fieldInputClass(Boolean(errors.laborRatePerHour), "pl-7")}
                data-error={errors.laborRatePerHour ? "true" : undefined}
              />
            </div>
            {errors.laborRatePerHour ? (
              <p className="mt-1 text-xs text-red-600">{errors.laborRatePerHour}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                SWFL average: $75–$140/hr depending on trade
              </p>
            )}
          </div>
          <div>
            <label htmlFor="markup" className={labelClass}>
              General markup
            </label>
            <div className="relative">
              <input
                id="markup"
                type="number"
                min={0}
                max={100}
                value={draft.markupPercentage}
                onChange={(e) =>
                  update("markupPercentage", Number(e.target.value) || 0)
                }
                className={fieldInputClass(Boolean(errors.markupPercentage), "pr-8")}
                data-error={errors.markupPercentage ? "true" : undefined}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                %
              </span>
            </div>
            {errors.markupPercentage && (
              <p className="mt-1 text-xs text-red-600">{errors.markupPercentage}</p>
            )}
          </div>
          <div>
            <label htmlFor="materialMarkup" className={labelClass}>
              Materials markup
            </label>
            <div className="relative">
              <input
                id="materialMarkup"
                type="number"
                min={0}
                max={100}
                value={draft.materialMarkupPercentage}
                onChange={(e) =>
                  update("materialMarkupPercentage", Number(e.target.value) || 0)
                }
                className={fieldInputClass(
                  Boolean(errors.materialMarkupPercentage),
                  "pr-8"
                )}
                data-error={errors.materialMarkupPercentage ? "true" : undefined}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                %
              </span>
            </div>
            {errors.materialMarkupPercentage && (
              <p className="mt-1 text-xs text-red-600">
                {errors.materialMarkupPercentage}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="minimumJob" className={labelClass}>
              Minimum job value
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                $
              </span>
              <input
                id="minimumJob"
                type="number"
                min={1}
                max={10000}
                value={draft.minimumJobValue}
                onChange={(e) =>
                  update("minimumJobValue", Number(e.target.value) || 0)
                }
                className={fieldInputClass(Boolean(errors.minimumJobValue), "pl-7")}
                data-error={errors.minimumJobValue ? "true" : undefined}
              />
            </div>
            {errors.minimumJobValue && (
              <p className="mt-1 text-xs text-red-600">{errors.minimumJobValue}</p>
            )}
          </div>
          <div>
            <label htmlFor="travelFee" className={labelClass}>
              Travel / service call fee
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                $
              </span>
              <input
                id="travelFee"
                type="number"
                min={0}
                max={500}
                value={draft.travelFee}
                onChange={(e) =>
                  update("travelFee", Number(e.target.value) || 0)
                }
                className={fieldInputClass(Boolean(errors.travelFee), "pl-7")}
                data-error={errors.travelFee ? "true" : undefined}
              />
            </div>
            {errors.travelFee && (
              <p className="mt-1 text-xs text-red-600">{errors.travelFee}</p>
            )}
          </div>
          <div>
            <label htmlFor="priceSpread" className={labelClass}>
              Price range spread
            </label>
            <div className="relative">
              <input
                id="priceSpread"
                type="number"
                min={5}
                max={30}
                value={draft.priceRangeSpread}
                onChange={(e) =>
                  update("priceRangeSpread", Number(e.target.value) || 12)
                }
                className={fieldInputClass(Boolean(errors.priceRangeSpread), "pr-8")}
                data-error={errors.priceRangeSpread ? "true" : undefined}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">
                %
              </span>
            </div>
            {errors.priceRangeSpread ? (
              <p className="mt-1 text-xs text-red-600">{errors.priceRangeSpread}</p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">
                Low/high estimates vary ±this % from recommended
              </p>
            )}
          </div>
          <div>
            <label htmlFor="validityDays" className={labelClass}>
              Quote validity (days)
            </label>
            <input
              id="validityDays"
              type="number"
              min={7}
              max={90}
              value={draft.quoteValidityDays}
              onChange={(e) =>
                update("quoteValidityDays", Number(e.target.value) || 30)
              }
              className={fieldInputClass(Boolean(errors.quoteValidityDays))}
              data-error={errors.quoteValidityDays ? "true" : undefined}
            />
            {errors.quoteValidityDays && (
              <p className="mt-1 text-xs text-red-600">{errors.quoteValidityDays}</p>
            )}
          </div>
        </div>

        <label className="mt-5 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50">
          <input
            type="checkbox"
            checked={draft.includeTravelFee}
            onChange={(e) => update("includeTravelFee", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-mercurius-600 focus:ring-mercurius-500"
          />
          <div>
            <span className="text-sm font-medium text-slate-800">
              Include travel fee on every quote
            </span>
            <p className="text-xs text-slate-400">
              Adds a service call line item automatically
            </p>
          </div>
        </label>
      </SettingsSection>

      <SettingsSection
        title="Branding"
        description="Your logo and branding on PDF exports."
      >
        <LogoUpload
          workspaceScope={workspaceScope}
          logoUrl={draft.logoUrl}
          legacyLogoDataUrl={draft.logoDataUrl}
          onChange={(url) => void handleLogoChange(url)}
          onLegacyClear={() => update("logoDataUrl", null)}
        />

        <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-lg border border-slate-100 p-4 transition-colors hover:bg-slate-50">
          <input
            type="checkbox"
            checked={draft.showPoweredByMercurius}
            onChange={(e) => update("showPoweredByMercurius", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-mercurius-600 focus:ring-mercurius-500"
          />
          <div>
            <span className="text-sm font-medium text-slate-800">
              Show &quot;Powered by Mercurius&quot; on PDF footer
            </span>
            <p className="text-xs text-slate-400">
              Subtle attribution while keeping your brand primary
            </p>
          </div>
        </label>
      </SettingsSection>

      <div className="sticky bottom-0 -mx-4 flex items-center justify-between border-t border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-sm sm:-mx-0 sm:rounded-2xl sm:border sm:px-6 sm:shadow-sm">
        <button
          type="button"
          disabled={isSaving}
          onClick={() => {
            if (!confirm("Reset all vendor settings to defaults?")) return;
            void toastPromise(resetProfile(), {
              loading: "Resetting profile...",
              success: "Profile reset to defaults.",
              error: "Could not reset profile. Please try again.",
            }).then(() => setDraft(DEFAULT_VENDOR_PROFILE));
          }}
          className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-60"
        >
          Reset to defaults
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving}
          className="inline-flex items-center gap-2 rounded-xl bg-mercurius-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-mercurius-700 focus:outline-none focus:ring-2 focus:ring-mercurius-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSaving ? "Saving..." : "Save Profile"}
        </button>
      </div>
    </div>
  );
}