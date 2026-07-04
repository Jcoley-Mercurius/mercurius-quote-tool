"use client";

import { useMemo, useState } from "react";
import { PhotoViewerModal } from "@/components/photos/PhotoViewerModal";
import { AcceptQuoteSection } from "./AcceptQuoteSection";
import { RequestChangesSection } from "./RequestChangesSection";
import { formatCurrency } from "@/lib/quote/format";
import type { PublicQuotePayload } from "@/lib/quotes/public-quote";
import { computeTotals } from "@/lib/quote/types";
import type { QuotePhotoThumbnail } from "@/lib/quote/types";
import { getVendorLogoSrc } from "@/lib/vendor/logo";

interface ClientQuoteViewProps {
  data: PublicQuotePayload;
  token: string;
}

function isQuoteExpired(createdAt: string, validityDays: number): boolean {
  const created = new Date(createdAt).getTime();
  const expiresAt = created + validityDays * 24 * 60 * 60 * 1000;
  return Date.now() > expiresAt;
}

export function ClientQuoteView({ data, token }: ClientQuoteViewProps) {
  const { quote, vendorProfile } = data;
  const totals = useMemo(() => computeTotals(quote.lineItems), [quote.lineItems]);
  const logoSrc = vendorProfile ? getVendorLogoSrc(vendorProfile) : null;
  const businessName = vendorProfile?.businessName || "Your Contractor";
  const [activePhoto, setActivePhoto] = useState<QuotePhotoThumbnail | null>(null);
  const [status, setStatus] = useState(data.status);

  const expired = isQuoteExpired(data.createdAt, quote.validityDays ?? 30);
  const alreadyAccepted = status === "accepted";
  const changesRequested = status === "changes_requested";

  const handleAccepted = () => {
    setStatus("accepted");
  };

  const handleChangesRequested = () => {
    setStatus("changes_requested");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {data.isDraftPreview && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-100"
        >
          <p className="font-medium">Preview only</p>
          <p className="mt-1 text-amber-800/90">
            This quote is still being finalized by your contractor. Pricing and
            scope may change.
          </p>
        </div>
      )}

      {expired && !alreadyAccepted && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-100"
        >
          <p className="font-medium">This quote has expired</p>
          <p className="mt-1 text-amber-800/90">
            This quote was valid for {quote.validityDays ?? 30} days and is no
            longer active. Please contact {businessName} for an updated estimate.
          </p>
        </div>
      )}

      {/* Contractor branding */}
      <header className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={`${businessName} logo`}
                className="h-14 w-auto max-w-[140px] object-contain"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-mercurius-100 text-lg font-bold text-mercurius-700">
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                {businessName}
              </h1>
              {vendorProfile?.tagline ? (
                <p className="mt-1 text-sm text-slate-500">
                  {vendorProfile.tagline}
                </p>
              ) : null}
            </div>
          </div>
          {(vendorProfile?.phone || vendorProfile?.email) && (
            <div className="text-sm text-slate-600">
              {vendorProfile.phone && (
                <p>
                  <span className="font-medium text-slate-700">Phone:</span>{" "}
                  <a
                    href={`tel:${vendorProfile.phone}`}
                    className="text-mercurius-700 hover:underline"
                  >
                    {vendorProfile.phone}
                  </a>
                </p>
              )}
              {vendorProfile.email && (
                <p className={vendorProfile.phone ? "mt-1" : ""}>
                  <span className="font-medium text-slate-700">Email:</span>{" "}
                  <a
                    href={`mailto:${vendorProfile.email}`}
                    className="text-mercurius-700 hover:underline"
                  >
                    {vendorProfile.email}
                  </a>
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Quote summary */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-mono text-xs text-slate-500">
            {data.reference}
          </span>
          <span className="rounded-full bg-mercurius-50 px-2.5 py-0.5 text-xs font-medium text-mercurius-700 ring-1 ring-mercurius-100">
            {data.jobName}
          </span>
          {alreadyAccepted && (
            <span className="rounded-full bg-mercurius-100 px-2.5 py-0.5 text-xs font-semibold text-mercurius-700">
              ✓ Accepted
            </span>
          )}
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {quote.title}
        </h2>
        {quote.propertyContext && (
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {quote.propertyContext}
          </p>
        )}
      </section>

      {/* Pricing */}
      <div className="grid gap-4 sm:grid-cols-3">
        <PriceCard
          label="Budget estimate"
          amount={totals.low}
          description="Economy scope"
        />
        <PriceCard
          label="Recommended"
          amount={totals.recommended}
          description="Best value"
          primary
        />
        <PriceCard
          label="Premium estimate"
          amount={totals.high}
          description="Upgraded scope"
        />
      </div>

      {/* Photos */}
      {quote.photoThumbnails && quote.photoThumbnails.length > 0 && (
        <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h3 className="text-lg font-semibold text-slate-900">Job photos</h3>
          <p className="mt-1 text-sm text-slate-500">
            Reference images from your contractor.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {quote.photoThumbnails.map((photo) => (
              <button
                key={photo.index}
                type="button"
                onClick={() => setActivePhoto(photo)}
                className="h-24 w-24 overflow-hidden rounded-lg border border-slate-200 bg-slate-100 transition hover:ring-2 hover:ring-mercurius-300 focus:outline-none focus:ring-2 focus:ring-mercurius-500"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.thumbnailUrl}
                  alt={`Job photo ${photo.index + 1}`}
                  className="h-full w-full object-cover"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Line items */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <h3 className="text-lg font-semibold text-slate-900">Scope & pricing</h3>
        <p className="mt-1 text-sm text-slate-500">
          Detailed breakdown of included work.
        </p>
        <div className="mt-6 -mx-2 overflow-x-auto sm:mx-0">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Item</th>
                <th className="hidden px-3 py-2 sm:table-cell">Qty</th>
                <th className="px-3 py-2 text-right">Recommended</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quote.lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-3 py-3">
                    <p className="font-medium text-slate-900">
                      {item.description}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {item.category}
                    </p>
                  </td>
                  <td className="hidden px-3 py-3 text-slate-600 sm:table-cell">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="px-3 py-3 text-right font-medium text-slate-900">
                    {formatCurrency(item.priceRecommended)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-6 border-t border-slate-200 pt-4 sm:ml-auto sm:w-80">
          <TotalRow label="Recommended total" amount={totals.recommended} highlight />
          <TotalRow label="Budget total" amount={totals.low} />
          <TotalRow label="Premium total" amount={totals.high} />
        </div>
      </section>

      {/* Assumptions & notes */}
      <div className="grid gap-6 sm:grid-cols-2">
        <ReadOnlyListSection title="What's included" items={quote.assumptions} />
        <ReadOnlyListSection title="Notes" items={quote.notes} />
      </div>

      {/* Accept section */}
      <AcceptQuoteSection
        token={token}
        quoteReference={data.reference}
        businessName={businessName}
        alreadyAccepted={alreadyAccepted}
        isExpired={expired && !alreadyAccepted}
        onAccepted={handleAccepted}
      />

      {/* Request Changes section — hidden once accepted or expired */}
      {!alreadyAccepted && !expired && (
        <RequestChangesSection
          token={token}
          quoteReference={data.reference}
          businessName={businessName}
          disabled={changesRequested}
          onSubmitted={handleChangesRequested}
        />
      )}

      {/* Confirmation when changes have been requested */}
      {changesRequested && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <span className="font-semibold">Change request submitted.</span>{" "}
          {businessName} will review your feedback and follow up with a revised quote.
        </div>
      )}

      {/* Footer */}
      <footer className="rounded-2xl border border-slate-200/80 bg-slate-50 px-6 py-5 text-center text-sm text-slate-500">
        <p>
          Valid for {quote.validityDays ?? 30} days · Prepared{" "}
          {new Date(data.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        {vendorProfile?.showPoweredByMercurius !== false && (
          <p className="mt-2 text-xs text-slate-400">
            Quote prepared with Mercurius
          </p>
        )}
      </footer>

      <PhotoViewerModal
        open={activePhoto !== null}
        onClose={() => setActivePhoto(null)}
        thumbnailUrl={activePhoto?.thumbnailUrl ?? ""}
        title={activePhoto ? `Job photo ${activePhoto.index + 1}` : undefined}
      />
    </div>
  );
}

function PriceCard({
  label,
  amount,
  description,
  primary = false,
}: {
  label: string;
  amount: number;
  description: string;
  primary?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-2xl border p-5 text-center",
        primary
          ? "border-mercurius-300 bg-gradient-to-b from-mercurius-50 to-white ring-1 ring-mercurius-200"
          : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <p
        className={[
          "text-xs font-semibold uppercase tracking-wide",
          primary ? "text-mercurius-700" : "text-slate-500",
        ].join(" ")}
      >
        {label}
      </p>
      <p
        className={[
          "mt-2 text-3xl font-bold tracking-tight",
          primary ? "text-mercurius-700" : "text-slate-700",
        ].join(" ")}
      >
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
    <div className="flex items-center justify-between py-1">
      <span className={highlight ? "font-semibold text-slate-900" : "text-slate-500"}>
        {label}
      </span>
      <span
        className={
          highlight
            ? "text-lg font-semibold text-mercurius-700"
            : "font-medium text-slate-700"
        }
      >
        {formatCurrency(amount)}
      </span>
    </div>
  );
}

function ReadOnlyListSection({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {items.map((item, index) => (
          <li key={index} className="flex gap-2 text-sm text-slate-700">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-mercurius-400" />
            <span className="leading-relaxed">{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
