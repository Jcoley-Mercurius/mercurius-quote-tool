import { generateQuoteReference } from "@/lib/pdf/reference";
import { computeTotals } from "@/lib/quote/types";
import type { ServiceType } from "@/components/quote-form/types";
import type { GeneratedQuote, QuoteFormPayload } from "@/lib/quote/types";
import type { SavedQuote } from "./types";

export function deriveJobName(form: QuoteFormPayload, quote: GeneratedQuote): string {
  const desc = form.jobDescription.trim();
  if (desc.length > 0) {
    const firstLine = desc.split("\n")[0].trim();
    return firstLine.length > 80 ? `${firstLine.slice(0, 77)}...` : firstLine;
  }
  return quote.title;
}

export function createSavedQuote(
  form: QuoteFormPayload,
  quote: GeneratedQuote,
  source: "ai" | "fallback"
): SavedQuote {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    reference: generateQuoteReference(quote.generatedAt),
    status: "draft",
    serviceType: form.serviceType,
    jobName: deriveJobName(form, quote),
    form,
    quote,
    source,
    createdAt: now,
    updatedAt: now,
  };
}

export function getRecommendedTotal(quote: GeneratedQuote): number {
  return computeTotals(quote.lineItems).recommended;
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function matchesSearch(saved: SavedQuote, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    saved.reference.toLowerCase().includes(q) ||
    saved.jobName.toLowerCase().includes(q) ||
    saved.form.zipCode.includes(q) ||
    saved.form.jobDescription.toLowerCase().includes(q)
  );
}

export function filterByService(
  saved: SavedQuote,
  service: ServiceType | "all"
): boolean {
  return service === "all" || saved.serviceType === service;
}

export function filterByStatus(
  saved: SavedQuote,
  status: SavedQuote["status"] | "all"
): boolean {
  return status === "all" || saved.status === status;
}