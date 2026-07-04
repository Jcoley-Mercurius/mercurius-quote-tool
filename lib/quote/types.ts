import type { ServiceType } from "@/components/quote-form/types";
import type { VendorPricingSettings } from "@/lib/vendor/types";
import type {
  GeneratedQuotePayload,
  QuoteAlertPayload,
  QuoteLineItemPayload,
} from "./schema";
import type { PhotoVisionAnalysis } from "./vision-schema";

export interface QuoteLineItem extends QuoteLineItemPayload {
  id: string;
}

export type QuoteAlert = QuoteAlertPayload;

export interface QuotePhotoThumbnail {
  thumbnailUrl: string;
  /** Storage path in quote-photo-originals bucket for full-size viewing */
  originalPath?: string;
  index: number;
  originalName?: string;
}

export interface GeneratedQuote extends GeneratedQuotePayload {
  lineItems: QuoteLineItem[];
  generatedAt: string;
  /** Vision analysis captured when photos were provided at generation time */
  photoAnalysis?: PhotoVisionAnalysis | null;
  /** Persisted compressed thumbnails from uploaded job photos */
  photoThumbnails?: QuotePhotoThumbnail[];
}

export interface QuotePhotoInput {
  dataUrl: string;
  mimeType: string;
}

export interface QuoteFormPayload {
  serviceType: ServiceType;
  squareFootage: string;
  stories: string;
  yearBuilt: string;
  zipCode: string;
  jobDescription: string;
  photoCount: number;
}

export interface GenerateQuoteRequest {
  form: QuoteFormPayload;
  vendor?: VendorPricingSettings;
  photos?: QuotePhotoInput[];
  photoAnalysis?: PhotoVisionAnalysis | null;
  regenerate?: boolean;
  existingQuote?: {
    lineItems: QuoteLineItem[];
    assumptions: string[];
    notes: string[];
  };
}

export interface QuoteTotals {
  low: number;
  recommended: number;
  high: number;
}

export function computeTotals(lineItems: QuoteLineItem[]): QuoteTotals {
  return lineItems.reduce(
    (acc, item) => ({
      low: acc.low + item.priceLow,
      recommended: acc.recommended + item.priceRecommended,
      high: acc.high + item.priceHigh,
    }),
    { low: 0, recommended: 0, high: 0 }
  );
}

export function addIdsToQuote(payload: GeneratedQuotePayload): GeneratedQuote {
  return {
    ...payload,
    lineItems: payload.lineItems.map((item, index) => ({
      ...item,
      id: `line-${index}-${Date.now()}`,
    })),
    generatedAt: new Date().toISOString(),
  };
}

export function createEmptyLineItem(): QuoteLineItem {
  return {
    id: `line-new-${Date.now()}`,
    category: "Other",
    description: "",
    quantity: 1,
    unit: "each",
    priceLow: 0,
    priceRecommended: 0,
    priceHigh: 0,
  };
}