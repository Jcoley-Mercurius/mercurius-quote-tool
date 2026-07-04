"use client";

import { useMemo, useState } from "react";
import { SERVICE_OPTIONS } from "@/components/quote-form/types";
import { formatShortDate } from "@/lib/quotes/helpers";
import {
  collectGalleryPhotos,
  DEFAULT_GALLERY_FILTERS,
  filterQuotesForGallery,
  hasActiveGalleryFilters,
  paginateGalleryPhotos,
  type GalleryFilters,
  type GalleryPhotoItem,
} from "@/lib/quotes/photo-gallery";
import {
  QUOTE_STATUS_LABELS,
  type QuoteStatus,
  type SavedQuote,
} from "@/lib/quotes/types";
import { DownloadQuotePhotosButton } from "./DownloadQuotePhotosButton";
import { GalleryServiceTypeFilter } from "./GalleryServiceTypeFilter";
import { PhotoViewerModal } from "./PhotoViewerModal";

interface JobPhotosGalleryProps {
  quotes: SavedQuote[];
  isLoading: boolean;
  title: string;
  description: string;
  emptyTitle: string;
  emptyDescription: string;
  countLabel: string;
}

export function JobPhotosGallery({
  quotes,
  isLoading,
  title,
  description,
  emptyTitle,
  emptyDescription,
  countLabel,
}: JobPhotosGalleryProps) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<GalleryFilters>(DEFAULT_GALLERY_FILTERS);
  const [activeItem, setActiveItem] = useState<GalleryPhotoItem | null>(null);

  const filteredQuotes = useMemo(
    () => filterQuotesForGallery(quotes, filters),
    [quotes, filters]
  );

  const galleryPhotos = useMemo(
    () => collectGalleryPhotos(filteredQuotes),
    [filteredQuotes]
  );

  const { items, totalPages, totalCount } = useMemo(
    () => paginateGalleryPhotos(galleryPhotos, page),
    [galleryPhotos, page]
  );

  const filtersActive = hasActiveGalleryFilters(filters);

  const updateFilter = <K extends keyof GalleryFilters>(
    key: K,
    value: GalleryFilters[K]
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters(DEFAULT_GALLERY_FILTERS);
    setPage(1);
  };

  return (
    <>
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <div className="mb-6 space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Search
            </span>
            <div className="relative">
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
                value={filters.search}
                onChange={(e) => updateFilter("search", e.target.value)}
                placeholder="Search by reference, job name, description, or service..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-700 focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20"
              />
            </div>
          </label>

          <GalleryServiceTypeFilter
            selected={filters.serviceTypes}
            onChange={(serviceTypes) => updateFilter("serviceTypes", serviceTypes)}
          />

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Quote status
              </span>
              <select
                value={filters.status}
                onChange={(e) =>
                  updateFilter("status", e.target.value as QuoteStatus | "all")
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20"
              >
                <option value="all">All statuses</option>
                {(Object.keys(QUOTE_STATUS_LABELS) as QuoteStatus[]).map(
                  (status) => (
                    <option key={status} value={status}>
                      {QUOTE_STATUS_LABELS[status]}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                From date
              </span>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter("dateFrom", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                To date
              </span>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter("dateTo", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-mercurius-500 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20"
              />
            </label>
          </div>

          {filtersActive ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-mercurius-700 transition hover:text-mercurius-800"
              >
                Clear all filters
              </button>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 py-10 text-sm text-slate-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-mercurius-600" />
            Loading photos...
          </div>
        ) : totalCount === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-6 py-12 text-center">
            <p className="text-sm font-medium text-slate-700">
              {filtersActive
                ? "No photos match your search or filters"
                : emptyTitle}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {filtersActive
                ? "Try a different search term or adjust your filter criteria."
                : emptyDescription}
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-xs text-slate-400">
              {totalCount} photo{totalCount === 1 ? "" : "s"} {countLabel}
              {filtersActive ? " (filtered)" : ""}
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => {
                const serviceLabel =
                  SERVICE_OPTIONS.find((s) => s.id === item.serviceType)?.label ??
                  item.serviceType;

                return (
                  <article
                    key={`${item.quoteId}-${item.photo.index}`}
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-mercurius-200 hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveItem(item)}
                      className="block w-full overflow-hidden text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-mercurius-500/20"
                    >
                      <div className="aspect-square overflow-hidden bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.photo.thumbnailUrl}
                          alt={item.photo.originalName ?? item.jobName}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      </div>
                    </button>
                    <div className="space-y-2 p-3">
                      <button
                        type="button"
                        onClick={() => setActiveItem(item)}
                        className="w-full text-left focus:outline-none"
                      >
                        <p className="truncate text-sm font-medium text-slate-900 group-hover:text-mercurius-700">
                          {item.jobName}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {item.quoteReference} · {serviceLabel}
                        </p>
                        <p className="text-xs text-slate-400">
                          {QUOTE_STATUS_LABELS[item.status]} ·{" "}
                          {formatShortDate(item.updatedAt)}
                        </p>
                      </button>
                      <div
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                      >
                        <DownloadQuotePhotosButton
                          quoteId={item.quoteId}
                          quoteReference={item.quoteReference}
                          photoCount={item.quotePhotoCount}
                          variant="gallery"
                        />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 ? (
              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm text-slate-500">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={page >= totalPages}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            ) : null}
          </>
        )}
      </section>

      <PhotoViewerModal
        open={activeItem !== null}
        onClose={() => setActiveItem(null)}
        thumbnailUrl={activeItem?.photo.thumbnailUrl ?? ""}
        originalPath={activeItem?.photo.originalPath}
        title={activeItem?.photo.originalName ?? activeItem?.jobName}
        subtitle={
          activeItem
            ? `${activeItem.quoteReference} · ${activeItem.jobName}`
            : undefined
        }
        quoteHref={
          activeItem ? `/?quoteId=${activeItem.quoteId}` : undefined
        }
      />
    </>
  );
}