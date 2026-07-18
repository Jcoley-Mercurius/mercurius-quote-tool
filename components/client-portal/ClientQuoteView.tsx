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

export function ClientQuoteView({ data, token }: ClientQuoteViewProps) {
  const { quote, vendorProfile } = data;
  const totals = useMemo(() => computeTotals(quote.lineItems), [quote.lineItems]);
  const logoSrc = vendorProfile ? getVendorLogoSrc(vendorProfile) : null;
  const businessName = vendorProfile?.businessName || "Your Contractor";
  const [activePhoto, setActivePhoto] = useState<QuotePhotoThumbnail | null>(null);
  const [status, setStatus] = useState(data.status);

  // Use server-computed isExpired flag (migration 016+); falls back to client-side calc.
  const expired = data.isExpired;
  const expiresAtFormatted = new Date(data.expiresAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const alreadyAccepted = status === "accepted";
  const changesRequested = status === "changes_requested";

  const handleAccepted = () => {
    setStatus("accepted");
  };

  const handleChangesRequested = () => {
    setStatus("changes_requested");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8 pb-16 sm:px-6">
      <div className="mb-2 flex items-center justify-center gap-2 text-xs text-slate-400">
        <svg className="h-3.5 w-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z"
            clipRule="evenodd"
          />
        </svg>
        Secured by Mercurius · Encrypted quote delivery
      </div>

      {data.isDraftPreview && (
        <div
          role="alert"
          className="flex gap-3 rounded-2xl border border-amber-200/80 bg-amber-50 p-4 shadow-sm ring-1 ring-amber-100"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <svg className="h-4 w-4 text-amber-600" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Preview — not yet finalized
            </p>
            <p className="mt-0.5 text-sm text-amber-800/80">
              Your contractor is still preparing this quote. Pricing and scope
              may change before it&apos;s sent for acceptance.
            </p>
          </div>
        </div>
      )}

      {expired && !alreadyAccepted && (
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
              Contact {businessName} directly to request an updated estimate.
            </p>
          </div>
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
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 text-lg font-bold text-emerald-700">
                {businessName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">
                Prepared for you by
              </p>
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
                    className="text-emerald-700 hover:underline"
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
                    className="text-emerald-700 hover:underline"
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
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                  clipRule="evenodd"
                />
              </svg>
              Accepted
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
      <div className="relative grid items-start gap-4 overflow-hidden sm:grid-cols-3 sm:overflow-visible">
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
        <h3 className="text-lg font-semibold text-slate-900">
          What&apos;s included in your quote
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          A full breakdown of work and materials.
        </p>
        <div className="mt-6 -mx-2 overflow-x-auto sm:mx-0">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-3 py-2">Item</th>
                <th className="hidden px-3 py-2 sm:table-cell">Qty</th>
                <th className="px-3 py-2 text-right">Recommended</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quote.lineItems.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-slate-50/60">
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
        <div className="mt-6 ml-auto w-full max-w-xs border-t border-slate-200 pt-4">
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
          {expired
            ? <>Expired <span className="font-medium text-red-500">{expiresAtFormatted}</span></>
            : <>Valid until <span className="font-medium text-slate-700">{expiresAtFormatted}</span></>
          }
          {" · "}Prepared{" "}
          {new Date(data.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
        {vendorProfile?.showPoweredByMercurius !== false && (
          <p className="mt-2 flex items-center justify-center gap-1 text-xs text-slate-400">
            <svg className="h-3 w-3 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3z" />
              <path d="M3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
            </svg>
            Delivered via Mercurius
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
  if (primary) {
    return (
      <div className="relative z-10 scale-[1.03] rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 text-center shadow-lg shadow-emerald-200/50 ring-1 ring-emerald-500/20">
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="whitespace-nowrap rounded-full bg-white px-3 py-0.5 text-xs font-bold text-emerald-700 shadow-sm ring-1 ring-emerald-200">
            Recommended
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
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 text-center shadow-sm">
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
