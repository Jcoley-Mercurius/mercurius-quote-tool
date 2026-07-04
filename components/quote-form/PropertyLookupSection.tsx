"use client";

import { useCallback, useState } from "react";
import { AddressAutocompleteInput } from "./AddressAutocompleteInput";
import { fetchPropertyLookup } from "@/lib/property/client-lookup";
import type {
  AddressSuggestion,
  PropertyLookupResult,
  PropertyMatchType,
} from "@/lib/property/types";

type LookupStatus = "idle" | "loading" | "success" | "not-found" | "error";

interface LookupFeedback {
  status: LookupStatus;
  message: string | null;
  sourceLabel?: string;
  matchType?: PropertyMatchType;
}

interface PropertyLookupSectionProps {
  propertyAddress: string;
  lookupZipCode: string;
  onPropertyAddressChange: (value: string) => void;
  onLookupZipCodeChange: (value: string) => void;
  onLookupSuccess: (result: PropertyLookupResult) => void;
}

const inputClass =
  "w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20";

const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";

export function PropertyLookupSection({
  propertyAddress,
  lookupZipCode,
  onPropertyAddressChange,
  onLookupZipCodeChange,
  onLookupSuccess,
}: PropertyLookupSectionProps) {
  const [feedback, setFeedback] = useState<LookupFeedback>({
    status: "idle",
    message: null,
  });

  const resetFeedback = useCallback(() => {
    setFeedback({ status: "idle", message: null });
  }, []);

  const handleLookup = useCallback(
    async (overrides?: { address?: string; zipCode?: string }) => {
      const address = (overrides?.address ?? propertyAddress).trim();
      const zipCode = (overrides?.zipCode ?? lookupZipCode).trim();

      if (!address && !zipCode) {
        setFeedback({
          status: "not-found",
          message: "Start typing an address or enter a zip code to look up.",
        });
        return;
      }

      setFeedback({ status: "loading", message: "Searching property records..." });

      try {
        const result = await fetchPropertyLookup({
          address: address || undefined,
          zipCode: zipCode || undefined,
        });

        if (!result.found) {
          setFeedback({
            status: "not-found",
            message:
              result.message ??
              "No property data found for this location. Enter details manually below.",
            sourceLabel: result.sourceLabel,
          });
          return;
        }

        onLookupSuccess(result);
        setFeedback({
          status: "success",
          message:
            result.message ??
            `Property data found${result.areaName ? ` for ${result.areaName}` : ""}. Review and adjust below.`,
          sourceLabel: result.sourceLabel,
          matchType: result.matchType,
        });
      } catch (error) {
        setFeedback({
          status: "error",
          message:
            error instanceof Error
              ? error.message
              : "Could not reach the property lookup service. Enter details manually.",
        });
      }
    },
    [lookupZipCode, onLookupSuccess, propertyAddress]
  );

  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    if (suggestion.zipCode) {
      onLookupZipCodeChange(suggestion.zipCode);
    }
    void handleLookup({
      address: suggestion.address,
      zipCode: suggestion.zipCode ?? lookupZipCode,
    });
  };

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-mercurius-100 bg-gradient-to-br from-mercurius-50/80 via-white to-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-mercurius-100 text-mercurius-700 ring-1 ring-mercurius-200">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path
              fillRule="evenodd"
              d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 00.281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 103 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 002.273 1.765 11.842 11.842 0 00.976.544l.062.029.018.008.006.003zM10 11.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Smart property lookup
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Start typing a Lee County address for suggestions. Selecting one
            instantly fills square footage, year built, and stories.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="propertyAddress" className={labelClass}>
            Property address
          </label>
          <AddressAutocompleteInput
            id="propertyAddress"
            value={propertyAddress}
            placeholder="Start typing — e.g. 1234 SE 47th Terrace, Cape Coral"
            onChange={(value) => {
              onPropertyAddressChange(value);
              if (feedback.status !== "idle" && feedback.status !== "loading") {
                resetFeedback();
              }
            }}
            onSelect={handleSuggestionSelect}
            className={inputClass}
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          <span>or zip only</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-40">
            <label htmlFor="lookupZipCode" className={labelClass}>
              Zip code
            </label>
            <input
              id="lookupZipCode"
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="33904"
              value={lookupZipCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 5);
                onLookupZipCodeChange(val);
                if (feedback.status !== "idle" && feedback.status !== "loading") {
                  resetFeedback();
                }
              }}
              className={inputClass}
            />
          </div>

          <button
            type="button"
            onClick={() => void handleLookup()}
            disabled={feedback.status === "loading"}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-mercurius-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-mercurius-700 focus:outline-none focus:ring-2 focus:ring-mercurius-500/30 disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[10rem]"
          >
            {feedback.status === "loading" ? (
              <>
                <svg
                  className="h-4 w-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
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
                Looking up...
              </>
            ) : (
              <>
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    fillRule="evenodd"
                    d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z"
                    clipRule="evenodd"
                  />
                </svg>
                Look up property
              </>
            )}
          </button>
        </div>
      </div>

      <LookupStatusBanner feedback={feedback} />
    </div>
  );
}

function LookupStatusBanner({ feedback }: { feedback: LookupFeedback }) {
  if (feedback.status === "idle" && !feedback.message) return null;

  const styles: Record<LookupStatus, string> = {
    idle: "bg-slate-50 text-slate-600 ring-slate-100",
    loading: "bg-slate-50 text-slate-700 ring-slate-200",
    success:
      feedback.matchType === "exact"
        ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
        : "bg-sky-50 text-sky-900 ring-sky-100",
    "not-found": "bg-amber-50 text-amber-900 ring-amber-100",
    error: "bg-red-50 text-red-800 ring-red-100",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`mt-4 rounded-lg px-3.5 py-3 text-sm ring-1 ${styles[feedback.status]}`}
    >
      {feedback.status === "loading" && (
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-mercurius-500" />
          <span>{feedback.message}</span>
        </div>
      )}

      {feedback.status === "success" && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 font-medium">
              {feedback.matchType === "exact" ? (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-emerald-600">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Exact match
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-sky-600">
                    <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.949 5.684zM13.949 13.684a1 1 0 00-1.898 0l-.184.551a1 1 0 01-.632.633l-.551.183a1 1 0 000 1.898l.551.183a1 1 0 01.633.633l.183.551a1 1 0 001.898 0l.184-.551a1 1 0 01.632-.633l.551-.183a1 1 0 000-1.898l-.551-.183a1 1 0 01-.633-.633l-.183-.551z" />
                  </svg>
                  Estimated
                </>
              )}
            </span>
            {feedback.sourceLabel && (
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-medium ring-1 ring-black/5">
                Data from {feedback.sourceLabel}
              </span>
            )}
          </div>
          <p className="text-[13px] leading-relaxed">{feedback.message}</p>
        </div>
      )}

      {(feedback.status === "not-found" || feedback.status === "error") && (
        <p>{feedback.message}</p>
      )}
    </div>
  );
}

export function AutoFillBadge({
  matchType,
}: {
  matchType?: PropertyMatchType;
}) {
  const isExact = matchType === "exact";

  return (
    <span
      className={[
        "ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1",
        isExact
          ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
          : "bg-sky-50 text-sky-700 ring-sky-100",
      ].join(" ")}
    >
      {isExact ? (
        <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5">
          <path d="M6 0a6 6 0 100 12A6 6 0 006 0zm2.78 3.72a.75.75 0 00-1.06 0L5.25 6.19 4.28 5.22a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.06 0l3-3a.75.75 0 000-1.06z" />
        </svg>
      ) : (
        <svg viewBox="0 0 12 12" fill="currentColor" className="h-2.5 w-2.5">
          <path d="M6 0l1.1 2.4L9.5 3l-1.9 1.8.45 2.7L6 6.3 3.95 7.5l.45-2.7L2.5 3l2.4-.6L6 0z" />
        </svg>
      )}
      {isExact ? "Exact" : "Estimated"}
    </span>
  );
}