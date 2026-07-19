"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FormSection } from "@/components/quote-form/FormSection";
import { PhotoUpload } from "@/components/quote-form/PhotoUpload";
import {
  ServiceTypeSelector,
  sampleServices,
  type ServiceType as ServiceSelectorItem,
} from "@/components/quote/ServiceTypeSelector";
import { SERVICE_OPTIONS, type ServiceType } from "@/components/quote-form/types";
import { encodePhotosForApi } from "@/lib/quote/photos";
import { getSwflAreaName, isSwflZip } from "@/lib/swfl";
import { toastError, toastSuccess } from "@/lib/ui/toast";
import { toastValidationErrors } from "@/lib/validation/toast";

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition duration-150";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

function GeneralServiceIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-7"
    >
      <path d="M14.7 6.3a3.9 3.9 0 0 0-5.1 5.1l-6 6 2 2 6-6a3.9 3.9 0 0 0 5.1-5.1l-2.4 2.4-2-2 2.4-2.4Z" />
    </svg>
  );
}

// Reuse the app's canonical service list (including "Other") with the visual
// selector's icon set so homeowners see the same trades vendors quote.
const SERVICE_ITEMS: ServiceSelectorItem[] = SERVICE_OPTIONS.map((option) => ({
  id: option.id,
  label: option.label,
  icon:
    sampleServices.find((service) => service.id === option.id)?.icon ?? (
      <GeneralServiceIcon />
    ),
}));

type Urgency = "emergency" | "urgent" | "soon" | "flexible";

const URGENCY_OPTIONS: { value: Urgency; label: string; hint: string }[] = [
  { value: "emergency", label: "Emergency", hint: "Needs attention today" },
  { value: "urgent", label: "Urgent", hint: "Within 48 hours" },
  { value: "soon", label: "This week", hint: "Not an emergency" },
  { value: "flexible", label: "Flexible", hint: "Whenever works" },
];

interface RepairFormData {
  serviceType: ServiceType | "";
  jobDescription: string;
  photos: File[];
  propertyAddress: string;
  zipCode: string;
  urgency: Urgency | "";
  fullName: string;
  email: string;
  phone: string;
}

const INITIAL_DATA: RepairFormData = {
  serviceType: "",
  jobDescription: "",
  photos: [],
  propertyAddress: "",
  zipCode: "",
  urgency: "",
  fullName: "",
  email: "",
  phone: "",
};

type RepairFormErrors = Partial<Record<keyof RepairFormData, string>>;

function validate(data: RepairFormData): RepairFormErrors {
  const errors: RepairFormErrors = {};
  if (!data.serviceType) {
    errors.serviceType = "Select the type of repair you need.";
  }
  if (data.jobDescription.trim().length < 10) {
    errors.jobDescription =
      "Please describe the problem (at least 10 characters).";
  }
  if (!/^\d{5}$/.test(data.zipCode)) {
    errors.zipCode = "Enter a valid 5-digit zip code.";
  }
  if (!data.urgency) {
    errors.urgency = "Let us know how urgent this is.";
  }
  if (!data.fullName.trim()) {
    errors.fullName = "Enter your name.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  return errors;
}

function ErrorText({ message }: { message: string }) {
  return (
    <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500" role="alert">
      <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      {message}
    </p>
  );
}

export function RepairRequestForm() {
  const [formData, setFormData] = useState<RepairFormData>(INITIAL_DATA);
  const [errors, setErrors] = useState<RepairFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedService, setSubmittedService] = useState<string | null>(null);

  const zipArea = useMemo(() => {
    if (formData.zipCode.length === 5) return getSwflAreaName(formData.zipCode);
    return null;
  }, [formData.zipCode]);

  const updateField = <K extends keyof RepairFormData>(
    key: K,
    value: RepairFormData[K]
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toastValidationErrors(validationErrors);
      const firstErrorField = document.querySelector("[data-error='true']");
      firstErrorField?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setIsSubmitting(true);
    try {
      const encodedPhotos =
        formData.photos.length > 0
          ? await encodePhotosForApi(formData.photos)
          : [];

      const photos = encodedPhotos.map((photo, index) => ({
        name: formData.photos[index]?.name ?? `photo-${index + 1}`,
        mimeType: photo.mimeType,
        dataUrl: photo.dataUrl,
        size: formData.photos[index]?.size ?? 0,
      }));

      const response = await fetch("/api/repair-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceType: formData.serviceType,
          description: formData.jobDescription.trim(),
          location: formData.propertyAddress.trim(),
          zip: formData.zipCode,
          urgency: formData.urgency,
          photos,
          name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        success?: boolean;
      };

      if (!response.ok) {
        throw new Error(
          payload.error ?? "Could not submit your repair request."
        );
      }

      const serviceLabel =
        SERVICE_OPTIONS.find((s) => s.id === formData.serviceType)?.label ??
        "your repair";
      setSubmittedService(serviceLabel);
      toastSuccess("Repair request submitted. We'll match you with local pros.");
    } catch (err) {
      toastError(err, "Could not submit your repair request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(INITIAL_DATA);
    setErrors({});
    setSubmittedService(null);
  };

  if (submittedService) {
    return (
      <div className="mx-auto max-w-lg py-12 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/60">
          <svg viewBox="0 0 24 24" fill="none" className="h-8 w-8">
            <path
              d="m5 13 4 4L19 7"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Repair request submitted
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
          Thanks{formData.fullName ? `, ${formData.fullName.split(" ")[0]}` : ""}!
          We&apos;re matching your {submittedService.toLowerCase()} request with
          trusted local vendors. Expect quotes to arrive by email shortly.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={resetForm}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            Submit another request
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6">
      {/* Hero */}
      <div className="text-center sm:text-left">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100">
          <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5">
            <path
              d="M12 3 5 6v5c0 4.8 2.9 8.1 7 10 4.1-1.9 7-5.2 7-10V6l-7-3Z"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinejoin="round"
            />
          </svg>
          Free · No obligation · SWFL local pros
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Request a home repair
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500 sm:text-base">
          Tell us what needs fixing and we&apos;ll match you with trusted local
          vendors who send you clear, itemized quotes — no haggling, no
          guesswork.
        </p>
      </div>

      {/* Step 1: Service type */}
      <div data-error={!!errors.serviceType}>
        <FormSection
          step={1}
          title="What needs to be repaired?"
          description="Choose the service that best fits your repair."
        >
          <ServiceTypeSelector
            services={SERVICE_ITEMS}
            value={formData.serviceType || undefined}
            onSelect={(service) =>
              updateField("serviceType", service.id as ServiceType)
            }
          />
          {errors.serviceType && <ErrorText message={errors.serviceType} />}
        </FormSection>
      </div>

      {/* Step 2: Describe the problem */}
      <div data-error={!!errors.jobDescription}>
        <FormSection
          step={2}
          title="Describe the problem"
          description="The more detail, the better your quotes. Mention symptoms, age of equipment, and any urgency."
        >
          <textarea
            id="jobDescription"
            rows={5}
            placeholder="Example: AC stopped cooling last night on a 2010 Cape Coral home. Unit is short-cycling and making a buzzing noise. Would like it looked at as soon as possible."
            value={formData.jobDescription}
            onChange={(e) => updateField("jobDescription", e.target.value)}
            className={`${inputClass} min-h-[120px] resize-y`}
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Tip: Include brand/model, access notes, and how long it&apos;s been
              happening.
            </p>
            <span className="text-xs text-slate-400">
              {formData.jobDescription.length} chars
            </span>
          </div>
          {errors.jobDescription && (
            <ErrorText message={errors.jobDescription} />
          )}
        </FormSection>
      </div>

      {/* Step 3: Location */}
      <div data-error={!!errors.zipCode}>
        <FormSection
          step={3}
          title="Where is the property?"
          description="Your zip helps us match vendors who serve your area and apply local pricing."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="propertyAddress" className={labelClass}>
                Street address{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                id="propertyAddress"
                type="text"
                placeholder="123 Palm Ave"
                value={formData.propertyAddress}
                onChange={(e) =>
                  updateField("propertyAddress", e.target.value)
                }
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="zipCode" className={labelClass}>
                Zip code
              </label>
              <input
                id="zipCode"
                type="text"
                inputMode="numeric"
                maxLength={5}
                placeholder="33904"
                value={formData.zipCode}
                onChange={(e) =>
                  updateField(
                    "zipCode",
                    e.target.value.replace(/\D/g, "").slice(0, 5)
                  )
                }
                className={inputClass}
              />
              {zipArea && (
                <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-600">
                  <svg viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                    <path
                      fillRule="evenodd"
                      d="m8 1.5-4 4.5V14h3v-3h2v3h3V6L8 1.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {zipArea} — local vendors available
                </p>
              )}
              {formData.zipCode.length === 5 && !isSwflZip(formData.zipCode) && (
                <p className="mt-2 text-xs text-amber-600">
                  Outside our primary Lee County area — we&apos;ll still try to
                  match you.
                </p>
              )}
              {errors.zipCode && <ErrorText message={errors.zipCode} />}
            </div>
          </div>
        </FormSection>
      </div>

      {/* Step 4: Urgency */}
      <div data-error={!!errors.urgency}>
        <FormSection
          step={4}
          title="How urgent is it?"
          description="This helps vendors prioritize and respond appropriately."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {URGENCY_OPTIONS.map((option) => {
              const selected = formData.urgency === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => updateField("urgency", option.value)}
                  aria-pressed={selected}
                  className={[
                    "flex flex-col gap-1 rounded-xl border-2 p-4 text-left transition-all",
                    selected
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-100"
                      : "border-slate-200 bg-white hover:border-emerald-300",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "text-sm font-semibold",
                      selected ? "text-emerald-700" : "text-slate-800",
                    ].join(" ")}
                  >
                    {option.label}
                  </span>
                  <span className="text-xs text-slate-500">{option.hint}</span>
                </button>
              );
            })}
          </div>
          {errors.urgency && <ErrorText message={errors.urgency} />}
        </FormSection>
      </div>

      {/* Step 5: Photos */}
      <FormSection
        step={5}
        title="Add photos (optional)"
        description="Photos of the problem help vendors assess scope and quote accurately before the first visit."
      >
        <PhotoUpload
          photos={formData.photos}
          onChange={(photos) => updateField("photos", photos)}
        />
      </FormSection>

      {/* Step 6: Contact */}
      <FormSection
        step={6}
        title="How should vendors reach you?"
        description="We share your contact details only with matched vendors so they can send quotes."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div data-error={!!errors.fullName}>
            <label htmlFor="fullName" className={labelClass}>
              Full name
            </label>
            <input
              id="fullName"
              type="text"
              placeholder="Jane Homeowner"
              value={formData.fullName}
              onChange={(e) => updateField("fullName", e.target.value)}
              className={inputClass}
            />
            {errors.fullName && <ErrorText message={errors.fullName} />}
          </div>
          <div data-error={!!errors.email}>
            <label htmlFor="email" className={labelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="jane@example.com"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={inputClass}
            />
            {errors.email && <ErrorText message={errors.email} />}
          </div>
          <div className="sm:col-span-2 sm:max-w-xs">
            <label htmlFor="phone" className={labelClass}>
              Phone{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="tel"
              placeholder="(239) 555-0142"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </FormSection>

      {/* Submit */}
      <div className="sticky bottom-0 -mx-6 border-t border-slate-200 bg-white/90 px-6 py-4 backdrop-blur-sm sm:-mx-0 sm:rounded-2xl sm:border sm:shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            Free to submit. Compare quotes from local pros with no obligation.
          </p>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-8 py-3 text-sm font-semibold text-white shadow-sm transition duration-150 hover:bg-emerald-700 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Submitting request...
              </>
            ) : (
              <>
                Submit repair request
                <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path
                    fillRule="evenodd"
                    d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.06-1.06l5.5 5.25a.75.75 0 010 1.06l-5.5 5.25a.75.75 0 11-1.06-1.06l4.158-3.96H3.75A.75.75 0 013 10z"
                    clipRule="evenodd"
                  />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
