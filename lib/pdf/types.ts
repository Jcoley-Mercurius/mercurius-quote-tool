import type { GeneratedQuote, QuoteFormPayload } from "@/lib/quote/types";
import type { VendorProfile } from "@/lib/vendor/types";

export interface PdfExportOptions {
  includeAlerts: boolean;
  includeAssumptions: boolean;
  includeNotes: boolean;
  includePriceRanges: boolean;
}

export const DEFAULT_PDF_OPTIONS: PdfExportOptions = {
  includeAlerts: true,
  includeAssumptions: true,
  includeNotes: true,
  includePriceRanges: true,
};

export interface PdfExportData {
  quote: GeneratedQuote;
  form: QuoteFormPayload;
  options: PdfExportOptions;
  vendor: VendorProfile;
  logoUrl: string;
  quoteReference: string;
}