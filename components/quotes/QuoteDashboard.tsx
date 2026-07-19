"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  SERVICE_OPTIONS,
  type ServiceType,
} from "@/components/quote-form/types";
import { formatCurrency } from "@/lib/quote/format";
import {
  filterByService,
  filterByStatus,
  formatShortDate,
  getQuoteExpiresAt,
  getRecommendedTotal,
  isQuoteExpired,
  matchesSearch,
} from "@/lib/quotes/helpers";
import { hasVendorSnapshot } from "@/lib/quotes/vendor-snapshot";
import {
  QUOTE_STATUS_LABELS,
  QUOTE_STATUS_STYLES,
  type QuoteStatus,
  type SavedQuote,
} from "@/lib/quotes/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { DeleteConfirmationModal } from "@/components/ui/DeleteConfirmationModal";
import { toastError, toastSuccess } from "@/lib/ui/toast";
import { useWorkspaceLabel } from "@/components/organizations/WorkspaceProvider";
import { useAuth } from "@/components/auth/AuthProvider";
import { useVendorProfile } from "@/components/vendor/VendorProfileProvider";
import {
  OnboardingChecklist,
  type OnboardingStep,
} from "@/components/vendor/OnboardingChecklist";
import { hasCustomLogo } from "@/lib/vendor/logo";
import { useQuoteHistory } from "./QuoteHistoryProvider";
import { QuotesLoadBanner } from "./QuotesLoadBanner";
import { DownloadQuotePhotosButton } from "@/components/photos/DownloadQuotePhotosButton";
import { QuotePhotoThumbnails } from "./QuotePhotoThumbnails";
import { RealtimeStatusBadge } from "./RealtimeStatusBadge";

export function QuoteDashboard() {
  const { quotes, isLoading, deleteQuote, updateQuote } = useQuoteHistory();
  const workspaceLabel = useWorkspaceLabel();
  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState<ServiceType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | "all" | "expired">("all");

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<SavedQuote | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const filtered = useMemo(() => {
    return quotes
      .filter((q) => matchesSearch(q, search))
      .filter((q) => filterByService(q, serviceFilter))
      .filter((q) => filterByStatus(q, statusFilter))
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }, [quotes, search, serviceFilter, statusFilter]);

  const stats = useMemo(() => {
    const draft = quotes.filter((q) => q.status === "draft").length;
    const sent = quotes.filter((q) => q.status === "sent").length;
    const viewed = quotes.filter((q) => q.status === "viewed").length;
    const accepted = quotes.filter((q) => q.status === "accepted").length;
    const changesRequested = quotes.filter((q) => q.status === "changes_requested").length;
    // Expired: non-accepted quotes past their validity window
    const expired = quotes.filter(
      (q) => q.status !== "accepted" && isQuoteExpired(q)
    ).length;
    const totalValue = quotes.reduce(
      (sum, q) => sum + getRecommendedTotal(q.quote),
      0
    );
    return { total: quotes.length, draft, sent, viewed, accepted, changesRequested, expired, totalValue };
  }, [quotes]);

  const handleDelete = (quote: SavedQuote) => {
    setDeleteTarget(quote);
  };

  const handleDeleteClose = () => {
    if (!isDeleting) setDeleteTarget(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteQuote(deleteTarget.id);
      toastSuccess("Quote deleted.");
      setDeleteTarget(null);
    } catch (err) {
      toastError(err, "Could not delete quote. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleStatusChange = (quote: SavedQuote, status: QuoteStatus) => {
    void updateQuote(quote.id, { status })
      .then(() => toastSuccess("Quote status updated."))
      .catch((err) => toastError(err, "Could not update quote status."));
  };

  if (isLoading) {
    return <LoadingState message="Loading your quotes..." />;
  }

  return (
    <>
      <DeleteConfirmationModal
        open={deleteTarget !== null}
        onClose={handleDeleteClose}
        onConfirm={() => void handleDeleteConfirm()}
        reference={deleteTarget?.reference ?? ""}
        jobName={deleteTarget?.jobName ?? ""}
        isDeleting={isDeleting}
      />

      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6 sm:py-8">
        <QuotesLoadBanner />
        <SetupChecklist hasQuotes={quotes.length > 0} />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Quote History
            </h1>
            <RealtimeStatusBadge />
          </div>
          <p className="mt-2 text-sm text-slate-500">
            All quotes in{" "}
            <span className="font-medium text-slate-700">{workspaceLabel}</span>{" "}
            workspace
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5z" />
          </svg>
          New Quote
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total Quotes" value={stats.total.toString()} />
        <StatCard label="Sent" value={stats.sent.toString()} />
        <StatCard label="Accepted" value={stats.accepted.toString()} highlight />
        <StatCard label="Changes Req." value={stats.changesRequested.toString()} warn={stats.changesRequested > 0} />
        <StatCard label="Expired" value={stats.expired.toString()} expired={stats.expired > 0} />
        <StatCard
          label="Pipeline Value"
          value={formatCurrency(stats.totalValue)}
          highlight
        />
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            >
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clipRule="evenodd"
              />
            </svg>
            <input
              type="search"
              placeholder="Search by reference, job name, or zip..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder:text-slate-400 transition duration-150 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <select
            value={serviceFilter}
            onChange={(e) =>
              setServiceFilter(e.target.value as ServiceType | "all")
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition duration-150 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All services</option>
            {SERVICE_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as QuoteStatus | "all" | "expired")
            }
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 transition duration-150 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="sent">Sent</option>
            <option value="viewed">Viewed</option>
            <option value="accepted">Accepted</option>
            <option value="changes_requested">Changes Requested</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>

      {/* Quote list */}
      {filtered.length > 0 && (
        <p className="text-xs text-slate-400">
          Showing {filtered.length} of {quotes.length} quote
          {quotes.length !== 1 ? "s" : ""}
        </p>
      )}
      {filtered.length === 0 ? (
        <EmptyState hasQuotes={quotes.length > 0} />
      ) : (
        <div className="space-y-3">
          {filtered.map((quote) => (
            <QuoteCard
              key={quote.id}
              quote={quote}
              onStatusChange={(status) => handleStatusChange(quote, status)}
              onDelete={() => handleDelete(quote)}
            />
          ))}
        </div>
      )}
    </div>
  </>
  );
}

function checklistDismissalKey(userId: string) {
  return `mercurius:setup-checklist-dismissed:${userId}`;
}

/**
 * First-run setup checklist shown on the dashboard. Completion state is derived
 * from the real vendor profile (business details, labor rate, logo) rather than
 * demo data, and dismissal persists per-user in localStorage — mirroring how
 * VendorProfileNudge behaves. It hides itself once required setup is done.
 */
function SetupChecklist({ hasQuotes }: { hasQuotes: boolean }) {
  const { user } = useAuth();
  const { profile, isLoading } = useVendorProfile();
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    if (!user?.id) return;
    setDismissed(
      localStorage.getItem(checklistDismissalKey(user.id)) === "1"
    );
  }, [user?.id]);

  const steps = useMemo<OnboardingStep[]>(() => {
    const profileComplete =
      profile.businessName.trim() !== "" && profile.phone.trim() !== "";
    // 95 is the untouched default; treat anything else as intentionally set.
    const laborRateSet =
      profile.laborRatePerHour > 0 && profile.laborRatePerHour !== 95;
    const logoAdded = hasCustomLogo(profile);

    return [
      {
        id: "business-profile",
        title: "Complete business profile",
        description: "Add your company details and contact information.",
        completed: profileComplete,
      },
      {
        id: "labor-rate",
        title: "Set labor rate",
        description: "Choose the default hourly rate used in your quotes.",
        completed: laborRateSet,
      },
      {
        id: "company-logo",
        title: "Add logo",
        description: "Personalize estimates with your company branding.",
        optional: true,
        completed: logoAdded,
      },
    ];
  }, [profile]);

  const allRequiredComplete = steps
    .filter((step) => !step.optional)
    .every((step) => step.completed);

  const handleDismiss = () => {
    if (user?.id) {
      localStorage.setItem(checklistDismissalKey(user.id), "1");
    }
    setDismissed(true);
  };

  if (isLoading || !user || dismissed || allRequiredComplete) {
    return null;
  }

  // Re-key on the derived completion signature so the checklist re-seeds when
  // the underlying vendor profile changes (e.g. after editing settings).
  const completionSignature = steps
    .map((step) => (step.completed ? "1" : "0"))
    .join("");

  return (
    <OnboardingChecklist
      key={completionSignature}
      steps={steps}
      title={
        hasQuotes ? "Finish setting up your workspace" : "Set up your quote workspace"
      }
      onDismiss={handleDismiss}
    />
  );
}

function StatCard({
  label,
  value,
  highlight,
  warn,
  expired,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  warn?: boolean;
  expired?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-xl border p-4 sm:p-5",
        highlight
          ? "border-emerald-200 bg-emerald-50"
          : warn
          ? "border-amber-200 bg-amber-50"
          : expired
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white",
      ].join(" ")}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={[
          "mt-1 text-2xl font-bold",
          highlight
            ? "text-emerald-700"
            : warn
            ? "text-amber-700"
            : expired
            ? "text-red-700"
            : "text-slate-900",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function QuoteCard({
  quote,
  onStatusChange,
  onDelete,
}: {
  quote: SavedQuote;
  onStatusChange: (status: QuoteStatus) => void;
  onDelete: () => void;
}) {
  const serviceLabel =
    SERVICE_OPTIONS.find((s) => s.id === quote.serviceType)?.label ??
    quote.serviceType;
  const total = getRecommendedTotal(quote.quote);
  const statusStyle = QUOTE_STATUS_STYLES[quote.status];
  const expired = quote.status !== "accepted" && isQuoteExpired(quote);
  const expiresAt = getQuoteExpiresAt(quote);
  const expiredOn = new Date(expiresAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div
      className={[
        "group rounded-2xl border bg-white p-5 shadow-sm transition-all hover:shadow-md sm:p-6",
        expired
          ? "border-red-200 hover:border-red-300"
          : "border-slate-200/80 hover:border-emerald-200",
      ].join(" ")}
    >
      {expired && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clipRule="evenodd" />
          </svg>
          <span className="font-medium">Expired {expiredOn}</span>
          <span className="text-red-500">— client can no longer accept this quote</span>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-medium text-slate-400">
              {quote.reference}
            </span>
            <select
              value={quote.status}
              onChange={(e) => onStatusChange(e.target.value as QuoteStatus)}
              aria-label={`Status for ${quote.reference}`}
              className={[
                "rounded-full border-0 px-2.5 py-0.5 text-xs font-medium ring-1 focus:outline-none focus:ring-2 focus:ring-emerald-500/20",
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
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {serviceLabel}
            </span>
            {hasVendorSnapshot(quote) ? (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                Snapshotted branding
              </span>
            ) : null}
          </div>
          <Link href={`/?quoteId=${quote.id}`} className="block">
            <h3 className="mt-2 truncate text-base font-semibold text-slate-900 group-hover:text-emerald-700">
              {quote.jobName}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {quote.form.zipCode} · {formatShortDate(quote.createdAt)}
              {quote.updatedAt !== quote.createdAt &&
                ` · Updated ${formatShortDate(quote.updatedAt)}`}
            </p>
            {quote.quote.photoThumbnails &&
            quote.quote.photoThumbnails.length > 0 ? (
              <div className="mt-3">
                <QuotePhotoThumbnails thumbnails={quote.quote.photoThumbnails} />
              </div>
            ) : null}
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-slate-400">Recommended</p>
            <p className="text-lg font-bold text-emerald-700">
              {formatCurrency(total)}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quote.quote.photoThumbnails &&
            quote.quote.photoThumbnails.length > 0 ? (
              <DownloadQuotePhotosButton
                quoteId={quote.id}
                quoteReference={quote.reference}
                photoCount={quote.quote.photoThumbnails.length}
                variant="compact"
              />
            ) : null}
            <Link
              href={`/?quoteId=${quote.id}`}
              className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
            >
              Open
            </Link>
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
              aria-label="Delete quote"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path
                  fillRule="evenodd"
                  d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 0 0-.53.74l.03.15a.75.75 0 0 0 .75.75h.75v9.5c0 .966.784 1.75 1.75 1.75h7.5A1.75 1.75 0 0 0 16 15.25v-9.5h.75a.75.75 0 0 0 .75-.75l.03-.15a.75.75 0 0 0-.53-.74 41.03 41.03 0 0 0-2.365-.298V3.75A2.75 2.75 0 0 0 13.25 1h-4.5ZM8 3.75V4h4v-.25A1.25 1.25 0 0 0 10.75 2.5h-1.5A1.25 1.25 0 0 0 8 3.75ZM7.5 7.5a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5a.75.75 0 0 1 .75-.75Zm5 0a.75.75 0 0 1 .75.75v5.5a.75.75 0 0 1-1.5 0v-5.5a.75.75 0 0 1 .75-.75Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ hasQuotes }: { hasQuotes: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-7 w-7">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">
        {hasQuotes ? "No quotes match your filters" : "No quotes yet"}
      </h3>
      <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
        {hasQuotes
          ? "Try adjusting your search or filter criteria."
          : "Create your first quote and it will appear here automatically. It only takes a minute."}
      </p>
      {!hasQuotes && (
        <Link
          href="/"
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          Create a Quote
        </Link>
      )}
    </div>
  );
}