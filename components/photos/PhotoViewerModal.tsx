"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getQuotePhotoSignedUrl } from "@/lib/supabase/quote-photo-storage";

interface PhotoViewerModalProps {
  open: boolean;
  onClose: () => void;
  thumbnailUrl: string;
  originalPath?: string | null;
  title?: string;
  subtitle?: string;
  quoteHref?: string;
}

export function PhotoViewerModal({
  open,
  onClose,
  thumbnailUrl,
  originalPath,
  title,
  subtitle,
  quoteHref,
}: PhotoViewerModalProps) {
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadFullPhoto = useCallback(async () => {
    if (!originalPath) {
      setFullUrl(thumbnailUrl);
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    try {
      const signedUrl = await getQuotePhotoSignedUrl(originalPath);
      setFullUrl(signedUrl);
    } catch {
      setLoadError("Could not load full-size photo. Showing thumbnail instead.");
      setFullUrl(thumbnailUrl);
    } finally {
      setIsLoading(false);
    }
  }, [originalPath, thumbnailUrl]);

  useEffect(() => {
    if (!open) {
      setFullUrl(null);
      setLoadError(null);
      return;
    }

    void loadFullPhoto();
  }, [open, loadFullPhoto]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Photo viewer"}
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            {title ? (
              <h2 className="truncate text-base font-semibold text-slate-900">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {quoteHref ? (
              <Link
                href={quoteHref}
                className="rounded-lg border border-mercurius-200 bg-mercurius-50 px-3 py-1.5 text-xs font-medium text-mercurius-700 transition hover:bg-mercurius-100"
                onClick={onClose}
              >
                Open quote
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close photo viewer"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex min-h-[240px] flex-1 items-center justify-center bg-slate-950/5 p-4">
          {isLoading ? (
            <div className="flex flex-col items-center gap-3 text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-mercurius-600" />
              <p className="text-sm">Loading full-size photo...</p>
            </div>
          ) : fullUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={fullUrl}
              alt={title ?? "Job photo"}
              className="max-h-[70vh] max-w-full rounded-lg object-contain"
            />
          ) : null}
        </div>

        {loadError ? (
          <p className="border-t border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-800">
            {loadError}
          </p>
        ) : null}
      </div>
    </div>
  );
}