import { pdf } from "@react-pdf/renderer";
import { QuotePdfDocument } from "@/components/pdf/QuotePdfDocument";
import { getLogoUrl } from "@/lib/vendor/logo";
import { generateQuoteReference } from "./reference";
import type { PdfExportData, PdfExportOptions } from "./types";
import type { GeneratedQuote, QuoteFormPayload } from "@/lib/quote/types";
import type { VendorProfile } from "@/lib/vendor/types";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export async function exportQuotePdf(
  quote: GeneratedQuote,
  form: QuoteFormPayload,
  vendor: VendorProfile,
  options: PdfExportOptions
): Promise<void> {
  const quoteReference = generateQuoteReference(quote.generatedAt);
  const logoUrl = getLogoUrl(vendor, window.location.origin);

  const data: PdfExportData = {
    quote,
    form,
    options,
    vendor,
    logoUrl,
    quoteReference,
  };

  const blob = await pdf(QuotePdfDocument({ data })).toBlob();
  const safeRef = quoteReference.replace(/[^a-zA-Z0-9-]/g, "");
  const brandPrefix = vendor.businessName
    ? vendor.businessName.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 30)
    : "Mercurius";
  const filename = `${brandPrefix}-Quote-${safeRef}.pdf`;
  triggerDownload(blob, filename);
}