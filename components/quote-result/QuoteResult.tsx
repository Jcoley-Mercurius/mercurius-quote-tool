"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useDebouncedCallback } from "@/lib/hooks/useDebouncedCallback";
import { toastSaved } from "@/lib/ui/toast";
import { formatCurrency } from "@/lib/quote/format";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_STYLES,
  type QuoteStatus,
} from "@/lib/quotes/types";
import { generateQuoteReference } from "@/lib/pdf/reference";
import {
  computeTotals,
  type GeneratedQuote,
  type QuoteFormPayload,
} from "@/lib/quote/types";
import type { VendorProfile } from "@/lib/vendor/types";
import { EditableLineItems } from "./EditableLineItems";
import { PdfExportButton } from "./PdfExportButton";
import { ShareQuoteButton } from "./ShareQuoteButton";
import { SendQuoteModal } from "./SendQuoteModal";
import { DownloadQuotePhotosButton } from "@/components/photos/DownloadQuotePhotosButton";
import { PhotoVisionSummary } from "./PhotoVisionSummary";
import { QuoteAlerts } from "./QuoteAlerts";
import { AcceptanceDetails } from "./AcceptanceDetails";
import { ChangeRequestsBanner } from "./ChangeRequestsBanner";

interface QuoteResultProps {
  quote: GeneratedQuote;
  form: QuoteFormPayload;
  source: "ai" | "fallback";
  quoteId?: string;
  quoteReference?: string;
  /** ISO string of when the quote was originally created (used for expiry check) */
  createdAt?: string;
  status?: QuoteStatus;
  vendorProfile?: VendorProfile;
  usesVendorSnapshot?: boolean;
  onRegenerate: (quote: GeneratedQuote) => void;
  onStartOver: () => void;
  onEditDetails?: () => void;
  onQuoteChange?: (quote: GeneratedQuote) => void;
  onStatusChange?: (status: QuoteStatus) => void;
  isRegenerating: boolean;
  /** Called when contractor clicks "Revise & Re-Send" from the banner or header */
  onReviseAndResend?: () => void;
  /**
   * When true the SendQuoteModal opens immediately on mount in "resend" mode.
   * Used by QuoteFlow after a revision is saved to auto-launch the send step.
   */
  defaultSendOpen?: boolean;
}

export function QuoteResult({
  quote: initialQuote,
  form,
  source,
  quoteId,
  quoteReference,
  createdAt,
  status = "draft",
  vendorProfile,
  usesVendorSnapshot = false,
  onRegenerate,
  onStartOver,
  onEditDetails,
  onQuoteChange,
  onStatusChange,
  isRegenerating,
  onReviseAndResend,
  defaultSendOpen = false,
}: QuoteResultProps) {
  const [quote, setQuote] = useState(initialQuote);
  const [hasEdits, setHasEdits] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(defaultSendOpen);

  const notifyLineItemsSaved = useDebouncedCallback(() => {
    toastSaved();
  }, 1200);

  const totals = useMemo(
    () => computeTotals(quote.lineItems),
    [quote.lineItems]
  );

  const handleQuoteUpdate = useCallback(
    (updates: Partial<GeneratedQuote>) => {
      setQuote((prev) => {
        const next = { ...prev, ...updates };
        onQuoteChange?.(next);
        return next;
      });
      setHasEdits(true);
    },
    [onQuoteChange]
  );

  const handleLineItemsChange = useCallback(
    (items: GeneratedQuote["lineItems"]) => {
      handleQuoteUpdate({ lineItems: items });
      notifyLineItemsSaved();
    },
    [handleQuoteUpdate, notifyLineItemsSaved]
  );

  const displayReference =
    quoteReference ?? generateQuoteReference(quote.generatedAt);
  const statusStyle = QUOTE_STATUS_STYLES[status];

  // Expiry check — only relevant for non-draft, non-accepted quotes with a createdAt
  const isExpired = (() => {
    if (!createdAt || status === "accepted" || status === "draft") return false;
    const validityDays = quote.validityDays ?? 30;
    const expiresAt = new Date(createdAt).getTime() + validityDays * 24 * 60 * 60 * 1000;
    return Date.now() > expiresAt;
  })();
  const expiresAtFormatted = createdAt
    ? new Date(
        new Date(createdAt).getTime() + (quote.validityDays ?? 30) * 24 * 60 * 60 * 1000
      ).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const handleRegenerate = () => {
    onRegenerate(quote);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/quotes"
        className="-ml-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-800"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path
            fillRule="evenodd"
            d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
            clipRule="evenodd"
          />
        </svg>
        Back to History
      </Link>

      {isExpired && expiresAtFormatted && (
        <div
          role="alert"
          className="flex gap-4 rounded-2xl border border-red-200/80 bg-red-50 p-5 shadow-sm ring-1 ring-red-100"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-red-900">
              This quote expired on {expiresAtFormatted}
            </p>
            <p className="mt-1 text-sm text-red-800/80">
              The client link is no longer valid for acceptance. Regenerate this
              quote or create a new one to send an updated estimate.
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mercurius-50 px-3 py-1 text-xs font-medium text-mercurius-700 ring-1 ring-mercurius-100">
              <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M8 1a4 4 0 0 0-4 4v1H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1V5a4 4 0 0 0-4-4zm2 5V5a2 2 0 1 0-4 0v1h4z" />
              </svg>
              Mercurius AI Quote
            </span>
            {source === "fallback" && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
                Demo mode — add OPENAI_API_KEY for live AI
              </span>
            )}
            {hasEdits && (
              <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 ring-1 ring-sky-200">
                Edited
              </span>
            )}
            <span className="font-mono text-xs text-slate-400">
              {displayReference}
            </span>
          </div>
          <div className="mb-3 flex items-center gap-3">
            <label htmlFor="quote-status" className="text-xs font-medium text-slate-500">
              Status
            </label>
            <select
              id="quote-status"
              value={status}
              onChange={(e) =>
                onStatusChange?.(e.target.value as QuoteStatus)
              }
              className={[
                "rounded-lg border-0 px-3 py-1.5 text-xs font-semibold ring-1 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20",
                statusStyle.bg,
                statusStyle.text,
                statusStyle.ring,
              ].join(" ")}
            >
              {(Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).map((s) => (
                <option key={s} value={s}>
                  {QUOTE_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {quote.title}
          </h1>
          {usesVendorSnapshot && vendorProfile ? (
            <p className="mt-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-medium text-slate-600">
                Snapshotted branding
              </span>
              {" · "}
              Uses {vendorProfile.businessName || "saved"} vendor settings from
              when this quote was created.
            </p>
          ) : null}
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            {quote.propertyContext}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Revise & Re-Send: prominent amber button when changes have been requested */}
          {status === "changes_requested" && quoteId && onReviseAndResend && (
            <button
              type="button"
              onClick={onReviseAndResend}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 1.449-.39 7 7 0 0 0-11.712-3.138l-.31-.31H4.99a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 0-1.5H6.8l.312.311a5.5 5.5 0 0 1 9.201 2.466.75.75 0 0 0 1.449.39Z"
                  clipRule="evenodd"
                />
              </svg>
              Revise &amp; Re-Send
            </button>
          )}
          {quoteId && (
            <ShareQuoteButton
              quoteId={quoteId}
              status={status}
              onStatusChange={onStatusChange}
            />
          )}
          {quoteId && (
            <button
              type="button"
              onClick={() => setSendModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
              </svg>
              Send to Client
            </button>
          )}
          {onEditDetails && (
            <button
              type="button"
              onClick={onEditDetails}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              Edit Job Details
            </button>
          )}
          <PdfExportButton
            quote={quote}
            form={form}
            vendorProfile={vendorProfile}
          />
          <button
            type="button"
            onClick={onStartOver}
            className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            New Quote
          </button>
        </div>
        </div>
      </div>

      {/* Quote metadata strip */}
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
        <span className="flex items-center gap-1.5">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
            />
          </svg>
          Quote #{displayReference}
        </span>

        <span className="flex items-center gap-1.5">
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Valid {quote.validityDays ?? 30} days
          {expiresAtFormatted && ` · Expires ${expiresAtFormatted}`}
        </span>

        {source === "ai" && (
          <span className="flex items-center gap-1.5 font-medium text-emerald-600">
            <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            AI-generated estimate
          </span>
        )}
      </div>

      {/* Price range cards */}
      <div className="relative grid items-start gap-4 sm:grid-cols-3">
        <PriceCard
          label="Low Estimate"
          amount={totals.low}
          description="Budget-conscious scope"
          variant="muted"
        />
        <PriceCard
          label="Recommended"
          amount={totals.recommended}
          description="Best value for this job"
          variant="primary"
        />
        <PriceCard
          label="High Estimate"
          amount={totals.high}
          description="Premium materials & scope"
          variant="muted"
        />
      </div>

      {quote.photoAnalysis ? (
        <PhotoVisionSummary
          analysis={quote.photoAnalysis}
          thumbnails={quote.photoThumbnails}
          quoteId={quoteId}
          quoteReference={displayReference}
        />
      ) : quote.photoThumbnails && quote.photoThumbnails.length > 0 ? (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Job photos</h2>
              <p className="mt-1 text-sm text-slate-500">
                Photos uploaded with this quote.
              </p>
            </div>
            {quoteId ? (
              <DownloadQuotePhotosButton
                quoteId={quoteId}
                quoteReference={displayReference}
                photoCount={quote.photoThumbnails.length}
              />
            ) : null}
          </div>
        </section>
      ) : null}

      {/* SWFL Insights */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <QuoteAlerts alerts={quote.alerts} />
      </div>

      {/* Acceptance record — shown when homeowner has signed */}
      {status === "accepted" && quoteId && (
        <AcceptanceDetails quoteId={quoteId} />
      )}

      {/* Change requests — shown when homeowner requested revisions */}
      {status === "changes_requested" && quoteId && (
        <ChangeRequestsBanner quoteId={quoteId} onReviseAndResend={onReviseAndResend} />
      )}

      {/* Line Items */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Line Items</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Click any value to edit. Changes auto-save.
          </p>
        </div>
        <div className="p-6">
          <EditableLineItems
            lineItems={quote.lineItems}
            onChange={handleLineItemsChange}
          />

          {/* Totals row */}
          <div className="mt-6 border-t border-slate-200 pt-4">
            <div className="flex flex-col gap-2 sm:ml-auto sm:w-80">
              <TotalRow label="Low total" amount={totals.low} />
              <TotalRow
                label="Recommended total"
                amount={totals.recommended}
                highlight
              />
              <TotalRow label="High total" amount={totals.high} />
            </div>
          </div>
        </div>
      </section>

      {/* Assumptions & Notes */}
      <div className="grid gap-6 sm:grid-cols-2">
        <EditableListSection
          title="Assumptions"
          description="What's included in this estimate"
          items={quote.assumptions}
          onChange={(assumptions) => handleQuoteUpdate({ assumptions })}
        />
        <EditableListSection
          title="Notes"
          description="Additional context for the homeowner"
          items={quote.notes}
          onChange={(notes) => handleQuoteUpdate({ notes })}
        />
      </div>

      {/* Sticky footer actions */}
      <div className="sticky bottom-0 -mx-4 border-t border-slate-200 bg-white/90 px-4 py-4 backdrop-blur-sm sm:-mx-0 sm:rounded-2xl sm:border sm:shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-400">
            Valid for {quote.validityDays} days · Generated{" "}
            {new Date(quote.generatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
          <div className="flex flex-wrap gap-3">
            <PdfExportButton
              quote={quote}
              form={form}
              vendorProfile={vendorProfile}
            />
            <button
              type="button"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-mercurius-200 bg-mercurius-50 px-6 py-3 text-sm font-semibold text-mercurius-700 transition-all hover:bg-mercurius-100 focus:outline-none focus:ring-2 focus:ring-mercurius-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isRegenerating ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Regenerating...
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39zm1.23-3.723a.75.75 0 0 0 1.449-.39 7 7 0 0 0-11.712-3.138l-.31-.31H4.99a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 0-1.5H6.8l.312.311a5.5 5.5 0 0 1 9.201 2.466.75.75 0 0 0 1.449.39z" clipRule="evenodd" />
                  </svg>
                  Regenerate with AI
                  {hasEdits && (
                    <span className="text-xs font-normal opacity-75">
                      (keeps your edits)
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      {/* Send to Client modal — mode=resend when opened via defaultSendOpen or Revise flow */}
      {quoteId && (
        <SendQuoteModal
          open={sendModalOpen}
          quoteId={quoteId}
          status={status}
          onClose={() => setSendModalOpen(false)}
          onStatusChange={onStatusChange}
          mode={defaultSendOpen ? "resend" : "send"}
        />
      )}
    </div>
  );
}

function PriceCard({
  label,
  amount,
  description,
  variant,
}: {
  label: string;
  amount: number;
  description: string;
  variant: "primary" | "muted";
}) {
  if (variant === "primary") {
    return (
      <div className="relative z-10 scale-[1.03] rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 shadow-lg shadow-emerald-200/50 ring-1 ring-emerald-500/20">
        {/* Best Value badge */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="whitespace-nowrap rounded-full bg-white px-3 py-0.5 text-xs font-bold text-emerald-700 shadow-sm ring-1 ring-emerald-200">
            Best Value
          </span>
        </div>

        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-100">
          {label}
        </p>
        <p className="mt-1 text-3xl font-extrabold text-white">
          {formatCurrency(amount)}
        </p>
        <p className="mt-1 text-xs text-emerald-200">{description}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-slate-800">
        {formatCurrency(amount)}
      </p>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function TotalRow({
  label,
  amount,
  highlight,
}: {
  label: string;
  amount: number;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={[
          "text-sm",
          highlight ? "font-semibold text-slate-900" : "text-slate-500",
        ].join(" ")}
      >
        {label}
      </span>
      <span
        className={[
          "text-sm font-semibold",
          highlight ? "text-mercurius-700 text-lg" : "text-slate-700",
        ].join(" ")}
      >
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function EditableListSection({
  title,
  description,
  items,
  onChange,
}: {
  title: string;
  description: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const inputClass =
    "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20";

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
      <ul className="mt-4 space-y-2">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2">
            <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-mercurius-400" />
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const updated = [...items];
                updated[index] = e.target.value;
                onChange(updated);
              }}
              className={inputClass}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}