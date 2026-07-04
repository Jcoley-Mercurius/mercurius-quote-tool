import {
  SERVICE_OPTIONS,
  type ServiceType,
} from "@/components/quote-form/types";
import type { QuotePhotoThumbnail } from "@/lib/quote/types";
import type { QuoteStatus, SavedQuote } from "./types";

export interface GalleryPhotoItem {
  quoteId: string;
  quoteReference: string;
  jobName: string;
  serviceType: SavedQuote["serviceType"];
  status: QuoteStatus;
  updatedAt: string;
  quotePhotoCount: number;
  photo: QuotePhotoThumbnail;
}

/** @deprecated Use GalleryPhotoItem */
export type OrgGalleryPhotoItem = GalleryPhotoItem;

export const GALLERY_PAGE_SIZE = 24;

/** @deprecated Use GALLERY_PAGE_SIZE */
export const ORG_GALLERY_PAGE_SIZE = GALLERY_PAGE_SIZE;

export interface GalleryFilters {
  serviceTypes: ServiceType[];
  status: QuoteStatus | "all";
  dateFrom: string;
  dateTo: string;
  search: string;
}

export const DEFAULT_GALLERY_FILTERS: GalleryFilters = {
  serviceTypes: [],
  status: "all",
  dateFrom: "",
  dateTo: "",
  search: "",
};

function parseDateEnd(isoDate: string): Date | null {
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T23:59:59.999`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDateStart(isoDate: string): Date | null {
  if (!isoDate) return null;
  const date = new Date(`${isoDate}T00:00:00.000`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serviceTypeLabel(serviceType: ServiceType): string {
  return (
    SERVICE_OPTIONS.find((option) => option.id === serviceType)?.label ??
    serviceType
  );
}

export function matchesGallerySearch(
  quote: SavedQuote,
  query: string
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const q = trimmed.toLowerCase();
  const label = serviceTypeLabel(quote.serviceType).toLowerCase();

  return (
    quote.id.toLowerCase().includes(q) ||
    quote.reference.toLowerCase().includes(q) ||
    quote.jobName.toLowerCase().includes(q) ||
    quote.form.jobDescription.toLowerCase().includes(q) ||
    quote.serviceType.toLowerCase().includes(q) ||
    label.includes(q)
  );
}

export function filterQuotesForGallery(
  quotes: SavedQuote[],
  filters: GalleryFilters
): SavedQuote[] {
  const from = parseDateStart(filters.dateFrom);
  const to = parseDateEnd(filters.dateTo);

  return quotes.filter((quote) => {
    if (
      filters.serviceTypes.length > 0 &&
      !filters.serviceTypes.includes(quote.serviceType)
    ) {
      return false;
    }

    if (filters.status !== "all" && quote.status !== filters.status) {
      return false;
    }

    if (!matchesGallerySearch(quote, filters.search)) {
      return false;
    }

    const updatedAt = new Date(quote.updatedAt);
    if (from && updatedAt < from) return false;
    if (to && updatedAt > to) return false;

    return true;
  });
}

export function hasActiveGalleryFilters(filters: GalleryFilters): boolean {
  return (
    filters.serviceTypes.length > 0 ||
    filters.status !== "all" ||
    Boolean(filters.dateFrom) ||
    Boolean(filters.dateTo) ||
    Boolean(filters.search.trim())
  );
}

export function collectGalleryPhotos(quotes: SavedQuote[]): GalleryPhotoItem[] {
  const items: GalleryPhotoItem[] = [];

  for (const quote of quotes) {
    const thumbnails = quote.quote.photoThumbnails;
    if (!thumbnails?.length) continue;

    for (const photo of thumbnails) {
      items.push({
        quoteId: quote.id,
        quoteReference: quote.reference,
        jobName: quote.jobName,
        serviceType: quote.serviceType,
        status: quote.status,
        updatedAt: quote.updatedAt,
        quotePhotoCount: thumbnails.length,
        photo,
      });
    }
  }

  return items.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/** @deprecated Use collectGalleryPhotos */
export function collectOrgGalleryPhotos(
  quotes: SavedQuote[]
): GalleryPhotoItem[] {
  return collectGalleryPhotos(quotes);
}

export function paginateGalleryPhotos<T>(
  items: T[],
  page: number,
  pageSize = GALLERY_PAGE_SIZE
): { items: T[]; totalPages: number; totalCount: number } {
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    totalPages,
    totalCount,
  };
}