"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { QuoteSaveTargetSelector } from "@/components/organizations/QuoteSaveTargetSelector";
import { useVendorProfile } from "@/components/vendor/VendorProfileProvider";
import type { Workspace } from "@/lib/organizations/types";
import { getSwflAreaName, isSwflZip, SWFL_PROPERTY_HINTS } from "@/lib/swfl";
import { FormSection } from "./FormSection";
import { PhotoUpload } from "./PhotoUpload";
import {
  AutoFillBadge,
  PropertyLookupSection,
} from "./PropertyLookupSection";
import { ServiceTypeSelector } from "./ServiceTypeSelector";
import type {
  PropertyLookupResult,
  PropertyMatchType,
} from "@/lib/property/types";
import { toastValidationErrors } from "@/lib/validation/toast";
import {
  INITIAL_FORM_DATA,
  STORY_OPTIONS,
  type AutoFilledPropertyField,
  type QuoteFormData,
  type ServiceType,
} from "./types";
import {
  validateQuoteForm,
  type QuoteFormErrors,
} from "./validation";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition duration-150";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

function autoFilledFieldClass(isAutoFilled: boolean): string {
  return isAutoFilled
    ? `${inputClass} border-mercurius-200 bg-mercurius-50/70 ring-1 ring-mercurius-100/80`
    : inputClass;
}

interface QuoteFormProps {
  onSubmit: (data: QuoteFormData) => Promise<void>;
  initialData?: QuoteFormData;
  submitLabel?: string;
  saveTarget?: Workspace;
  onSaveTargetChange?: (workspace: Workspace) => void;
}

export function QuoteForm({
  onSubmit,
  initialData,
  submitLabel = "Generate Quote",
  saveTarget,
  onSaveTargetChange,
}: QuoteFormProps) {
  const { profile } = useVendorProfile();
  const [formData, setFormData] = useState<QuoteFormData>(
    initialData ?? INITIAL_FORM_DATA
  );
  const [errors, setErrors] = useState<QuoteFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lookupZipCode, setLookupZipCode] = useState("");
  const [autoFilledFields, setAutoFilledFields] = useState<
    Set<AutoFilledPropertyField>
  >(new Set());
  const [lookupMatchType, setLookupMatchType] = useState<
    PropertyMatchType | undefined
  >();

  const zipArea = useMemo(() => {
    if (formData.zipCode.length === 5) {
      return getSwflAreaName(formData.zipCode);
    }
    return null;
  }, [formData.zipCode]);

  const completionScore = useMemo(() => {
    let filled = 0;
    const total = 6;
    if (formData.serviceType) filled++;
    if (formData.squareFootage) filled++;
    if (formData.stories) filled++;
    if (formData.yearBuilt) filled++;
    if (formData.zipCode.length === 5) filled++;
    if (formData.jobDescription.trim().length >= 10) filled++;
    return Math.round((filled / total) * 100);
  }, [formData]);

  const updateField = <K extends keyof QuoteFormData>(
    key: K,
    value: QuoteFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const updateFieldManually = <K extends keyof QuoteFormData>(
    key: K,
    value: QuoteFormData[K]
  ) => {
    updateField(key, value);
    if (
      key === "squareFootage" ||
      key === "stories" ||
      key === "yearBuilt" ||
      key === "zipCode"
    ) {
      setAutoFilledFields((prev) => {
        if (!prev.has(key)) return prev;
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handlePropertyLookupSuccess = (result: PropertyLookupResult) => {
    const filled = new Set<AutoFilledPropertyField>();

    setFormData((prev) => {
      const next = { ...prev };

      if (result.squareFootage != null) {
        next.squareFootage = String(result.squareFootage);
        filled.add("squareFootage");
      }
      if (result.stories) {
        next.stories = result.stories;
        filled.add("stories");
      }
      if (result.yearBuilt != null) {
        next.yearBuilt = String(result.yearBuilt);
        filled.add("yearBuilt");
      }
      if (result.zipCode) {
        next.zipCode = result.zipCode;
        filled.add("zipCode");
      }

      return next;
    });

    setAutoFilledFields(filled);
    setLookupMatchType(result.matchType);
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of filled) {
        delete next[key];
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateQuoteForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toastValidationErrors(validationErrors);
      const firstErrorField = document.querySelector("[data-error='true']");
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const wizardSteps = [
    { label: "Service", complete: Boolean(formData.serviceType) },
    {
      label: "Property",
      complete: Boolean(
        formData.squareFootage && formData.stories && formData.yearBuilt
      ),
    },
    {
      label: "Job details",
      complete: Boolean(
        formData.zipCode.length === 5 &&
          formData.jobDescription.trim().length >= 10
      ),
    },
  ];
  const activeStepIndex = wizardSteps.findIndex((step) => !step.complete);
  const displayStepIndex = activeStepIndex === -1 ? wizardSteps.length - 1 : activeStepIndex;

  return (
    <form
      onSubmit={handleSubmit}
      className="mx-auto flex max-w-5xl flex-col gap-6 pb-24 md:pb-0"
    >
      <header className="flex flex-col gap-6">
        <Link
          href="/quotes"
          className="group inline-flex w-fit items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-4"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            fill="none"
            className="size-4 transition-transform group-hover:-translate-x-0.5"
          >
            <path
              d="M16 10H4m5-5-5 5 5 5"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to quotes
        </Link>

        <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-mercurius-50 px-3 py-1 text-xs font-semibold text-mercurius-700 ring-1 ring-mercurius-100">
                <svg aria-hidden="true" viewBox="0 0 16 16" fill="currentColor" className="size-3.5">
                  <path d="M8 1a4 4 0 0 0-4 4v1H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1V5a4 4 0 0 0-4-4zm2 5V5a2 2 0 1 0-4 0v1h4z" />
                </svg>
                SWFL market intelligence
              </span>
              {profile.businessName && (
                <Link
                  href="/settings"
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-200"
                >
                  {profile.businessName} · ${profile.laborRatePerHour}/hr
                </Link>
              )}
            </div>
            <h1 className="text-balance text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Create a new quote
            </h1>
            <p className="text-pretty text-sm leading-6 text-slate-500 sm:text-base">
              Add the job details and Mercurius will build a polished, locally
              informed quote ready to send to your client.
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold tabular-nums text-emerald-700">
            {completionScore}% complete
          </p>
        </div>

        <nav aria-label="Quote creation progress" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <ol className="grid grid-cols-3 gap-2 sm:gap-4">
            {wizardSteps.map((step, index) => {
              const isComplete = step.complete;
              const isCurrent = index === displayStepIndex && !isComplete;
              return (
                <li key={step.label} className="flex min-w-0 items-center gap-2 sm:gap-3">
                  <span
                    className={[
                      "flex size-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors",
                      isComplete
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : isCurrent
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-slate-50 text-slate-400",
                    ].join(" ")}
                  >
                    {isComplete ? (
                      <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="size-4">
                        <path d="m3.5 8 3 3 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  <span className={isCurrent || isComplete ? "truncate text-xs font-semibold text-slate-900 sm:text-sm" : "truncate text-xs font-medium text-slate-400 sm:text-sm"}>
                    {step.label}
                  </span>
                </li>
              );
            })}
          </ol>
          <div
            className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label="Quote completion"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={completionScore}
          >
            <div
              className="h-full rounded-full bg-emerald-600 transition-[width] duration-500"
              style={{ width: `${completionScore}%` }}
            />
          </div>
        </nav>
      </header>

      <div className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 shadow-sm sm:p-5 lg:p-6">

      {/* Section 1: Service Type */}
      <div data-error={!!errors.serviceType}>
        <FormSection
          step={1}
          title="What service is this quote for?"
          description="Select the trade. We'll tailor pricing logic and local factors to your specialty."
        >
          <ServiceTypeSelector
            value={formData.serviceType}
            onChange={(v: ServiceType) => updateField("serviceType", v)}
            error={errors.serviceType}
          />
        </FormSection>
      </div>

      {/* Section 2: Property Details */}
      <FormSection
        step={2}
        title="Property details"
        description="Age and size matter in SWFL — older homes often need code upgrades, and sizing drives HVAC and roofing estimates."
      >
        <PropertyLookupSection
          propertyAddress={formData.propertyAddress}
          lookupZipCode={lookupZipCode}
          onPropertyAddressChange={(value) =>
            updateField("propertyAddress", value)
          }
          onLookupZipCodeChange={setLookupZipCode}
          onLookupSuccess={handlePropertyLookupSuccess}
        />

        <div className="grid gap-5 sm:grid-cols-3">
          <div data-error={!!errors.squareFootage}>
            <label htmlFor="squareFootage" className={labelClass}>
              Square footage
              {autoFilledFields.has("squareFootage") && (
                <AutoFillBadge matchType={lookupMatchType} />
              )}
            </label>
            <input
              id="squareFootage"
              type="number"
              min={100}
              max={20000}
              placeholder="e.g. 1,850"
              value={formData.squareFootage}
              onChange={(e) =>
                updateFieldManually("squareFootage", e.target.value)
              }
              className={autoFilledFieldClass(
                autoFilledFields.has("squareFootage")
              )}
            />
            <p className="mt-1 text-xs text-slate-400">
              {SWFL_PROPERTY_HINTS.squareFootage}
            </p>
            {errors.squareFootage && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.squareFootage}
              </p>
            )}
          </div>

          <div data-error={!!errors.stories}>
            <span className={labelClass}>
              Stories
              {autoFilledFields.has("stories") && (
                <AutoFillBadge matchType={lookupMatchType} />
              )}
            </span>
            <div className="flex gap-2">
              {STORY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateFieldManually("stories", option.value)}
                  className={[
                    "flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition-all",
                    formData.stories === option.value
                      ? autoFilledFields.has("stories")
                        ? "border-mercurius-500 bg-mercurius-50 text-mercurius-700 ring-2 ring-mercurius-100"
                        : "border-mercurius-500 bg-mercurius-50 text-mercurius-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-mercurius-300",
                  ].join(" ")}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {errors.stories && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.stories}
              </p>
            )}
          </div>

          <div data-error={!!errors.yearBuilt}>
            <label htmlFor="yearBuilt" className={labelClass}>
              Year built
              {autoFilledFields.has("yearBuilt") && (
                <AutoFillBadge matchType={lookupMatchType} />
              )}
            </label>
            <input
              id="yearBuilt"
              type="number"
              min={1950}
              max={new Date().getFullYear()}
              placeholder="e.g. 1987"
              value={formData.yearBuilt}
              onChange={(e) => updateFieldManually("yearBuilt", e.target.value)}
              className={autoFilledFieldClass(autoFilledFields.has("yearBuilt"))}
            />
            <p className="mt-1 text-xs text-slate-400">
              {SWFL_PROPERTY_HINTS.yearBuilt}
            </p>
            {errors.yearBuilt && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.yearBuilt}
              </p>
            )}
          </div>
        </div>
      </FormSection>

      {/* Section 3: Location */}
      <div data-error={!!errors.zipCode}>
        <FormSection
          step={3}
          title="Job location"
          description="Zip code helps us apply Lee County pricing, permit costs, and travel time."
        >
          <div className="max-w-xs">
            <label htmlFor="zipCode" className={labelClass}>
              Zip code
              {autoFilledFields.has("zipCode") && (
                <AutoFillBadge matchType={lookupMatchType} />
              )}
            </label>
            <input
              id="zipCode"
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="33904"
              value={formData.zipCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                updateFieldManually("zipCode", val);
              }}
              className={autoFilledFieldClass(autoFilledFields.has("zipCode"))}
            />
            {zipArea && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-mercurius-600">
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="m8 1.5-4 4.5V14h3v-3h2v3h3V6L8 1.5z" clipRule="evenodd" />
                </svg>
                {zipArea} — recognized SWFL service area
              </p>
            )}
            {formData.zipCode.length === 5 && !isSwflZip(formData.zipCode) && (
              <p className="mt-2 text-xs text-amber-600">
                Outside our primary Lee County area — quote will use regional defaults.
              </p>
            )}
            {errors.zipCode && (
              <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.zipCode}
              </p>
            )}
          </div>
        </FormSection>
      </div>

      {/* Section 4: Job Description */}
      <div data-error={!!errors.jobDescription}>
        <FormSection
          step={4}
          title="Job description & special requests"
          description="The more detail, the better the quote. Mention hurricane damage, pool equipment, slab issues, or code concerns."
        >
          <textarea
            id="jobDescription"
            rows={5}
            placeholder="Example: Replace 3-ton AC unit on 1985 Cape Coral pool home. Current unit is 18 years old, short-cycling. May need ductwork inspection due to humidity damage. Customer wants hurricane-rated condenser pad."
            value={formData.jobDescription}
            onChange={(e) => updateField("jobDescription", e.target.value)}
            className={`${inputClass} resize-y min-h-[120px]`}
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Tip: Include brand/model numbers, urgency, and access notes
            </p>
            <span className="text-xs text-slate-400">
              {formData.jobDescription.length} chars
            </span>
          </div>
          {errors.jobDescription && (
            <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
              <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.jobDescription}
            </p>
          )}
        </FormSection>
      </div>

      {saveTarget && onSaveTargetChange && (
        <QuoteSaveTargetSelector
          value={saveTarget}
          onChange={onSaveTargetChange}
        />
      )}

      {/* Section 5: Photos */}
      <FormSection
        step={5}
        title="Photos (optional)"
        description="Upload photos of the job site, damage, equipment nameplates, or existing work. Visual context improves quote accuracy."
      >
        <PhotoUpload
          photos={formData.photos}
          onChange={(photos) => updateField("photos", photos)}
        />
      </FormSection>

      </div>

      {/* Desktop action */}
      <div className="hidden items-center justify-between gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:flex">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-semibold text-slate-900">Ready to build your quote?</p>
          <p className="text-xs leading-5 text-slate-500">
            AI analyzes your details and SWFL market factors in seconds.
          </p>
        </div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Generating Quote..." : submitLabel}
          {!isSubmitting && (
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-4">
              <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile action */}
      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border-x border-t border-slate-200 bg-white/95 px-4 pt-3 shadow-[0_-8px_30px_rgba(15,23,42,0.10)] backdrop-blur-md md:hidden pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <button
          type="submit"
          disabled={isSubmitting}
          className="mx-auto flex min-h-14 w-full max-w-lg items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-4 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transform-none"
        >
          {isSubmitting ? "Generating Quote..." : submitLabel}
          {!isSubmitting && (
            <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" className="size-5">
              <path d="M4 10h12m-5-5 5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );
}
