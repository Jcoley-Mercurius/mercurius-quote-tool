"use client";

import { useState } from "react";
import { useVendorProfile } from "@/components/vendor/VendorProfileProvider";
import { exportQuotePdf } from "@/lib/pdf/export";
import type { VendorProfile } from "@/lib/vendor/types";
import { toastPromise } from "@/lib/ui/toast";
import {
  DEFAULT_PDF_OPTIONS,
  type PdfExportOptions,
} from "@/lib/pdf/types";
import type { GeneratedQuote, QuoteFormPayload } from "@/lib/quote/types";

interface PdfExportButtonProps {
  quote: GeneratedQuote;
  form: QuoteFormPayload;
  vendorProfile?: VendorProfile;
}

const OPTION_LABELS: {
  key: keyof PdfExportOptions;
  label: string;
  description: string;
}[] = [
  {
    key: "includePriceRanges",
    label: "Price ranges",
    description: "Include low and high estimates",
  },
  {
    key: "includeAlerts",
    label: "SWFL insights",
    description: "Local warnings and recommendations",
  },
  {
    key: "includeAssumptions",
    label: "Assumptions",
    description: "Scope and conditions",
  },
  {
    key: "includeNotes",
    label: "Notes",
    description: "Additional context for homeowner",
  },
];

export function PdfExportButton({
  quote,
  form,
  vendorProfile,
}: PdfExportButtonProps) {
  const { profile: liveProfile } = useVendorProfile();
  const profile = vendorProfile ?? liveProfile;
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [options, setOptions] = useState<PdfExportOptions>(DEFAULT_PDF_OPTIONS);


  const toggleOption = (key: keyof PdfExportOptions) => {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await toastPromise(exportQuotePdf(quote, form, profile, options), {
        loading: "Generating PDF...",
        success: "PDF exported successfully.",
        error: "PDF export failed. Please try again.",
      });
      setIsOpen(false);
    } catch {
      // Error toast shown by toastPromise
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-mercurius-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-mercurius-700 focus:outline-none focus:ring-2 focus:ring-mercurius-500 focus:ring-offset-2"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V2.75z" />
          <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
        </svg>
        Export PDF
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-900">
              Export Quote PDF
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Choose sections to include in your branded PDF
            </p>

            <div className="mt-4 space-y-3">
              {OPTION_LABELS.map(({ key, label, description }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-100 p-3 transition-colors hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    checked={options[key]}
                    onChange={() => toggleOption(key)}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-mercurius-600 focus:ring-mercurius-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-slate-800">
                      {label}
                    </span>
                    <p className="text-xs text-slate-400">{description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-mercurius-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mercurius-700 disabled:opacity-60"
              >
                {isExporting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  "Download PDF"
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}