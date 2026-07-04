"use client";

import { useState } from "react";
import { downloadQuotePhotosZip } from "@/lib/quote/download-photos";
import { toastError } from "@/lib/ui/toast";

interface DownloadQuotePhotosButtonProps {
  quoteId: string;
  quoteReference: string;
  photoCount: number;
  variant?: "default" | "compact" | "gallery";
  className?: string;
}

export function DownloadQuotePhotosButton({
  quoteId,
  quoteReference,
  photoCount,
  variant = "default",
  className = "",
}: DownloadQuotePhotosButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (photoCount === 0) return null;

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadQuotePhotosZip(quoteId, quoteReference);
    } catch (error) {
      toastError(error, "Could not download photos. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const baseClass =
    variant === "gallery"
      ? "inline-flex w-full items-center justify-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      : variant === "compact"
        ? "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        : "inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <button
      type="button"
      onClick={() => void handleDownload()}
      disabled={isDownloading}
      className={`${baseClass} ${className}`.trim()}
      aria-label="Download all photos"
    >
      {isDownloading ? (
        <>
          <svg
            className={`${variant === "gallery" ? "h-3 w-3" : "h-4 w-4"} animate-spin`}
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
          {variant === "gallery" ? "Preparing..." : "Preparing zip..."}
        </>
      ) : (
        <>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={variant === "gallery" ? "h-3 w-3" : "h-4 w-4"}
          >
            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 1 0-1.09-1.03l-2.955 3.129V2.75Z" />
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
          </svg>
          {variant === "gallery" ? "Download Photos" : "Download All Photos"}
        </>
      )}
    </button>
  );
}