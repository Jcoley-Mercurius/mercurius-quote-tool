import type { ServiceType } from "@/components/quote-form/types";
import type { GeneratedQuote, QuoteFormPayload } from "@/lib/quote/types";
import { parseVendorSnapshot } from "@/lib/quotes/vendor-snapshot";
import type { QuoteStatus } from "@/lib/quotes/types";
import type { VendorProfile } from "@/lib/vendor/types";

export interface PublicQuoteRow {
  id: string;
  reference: string;
  status: QuoteStatus;
  service_type: string;
  job_name: string;
  form_data: QuoteFormPayload;
  quote_data: GeneratedQuote;
  source: "ai" | "fallback";
  vendor_snapshot: unknown;
  created_at: string;
  updated_at: string;
}

export interface PublicQuotePayload {
  id: string;
  reference: string;
  status: QuoteStatus;
  serviceType: ServiceType;
  jobName: string;
  form: QuoteFormPayload;
  quote: GeneratedQuote;
  source: "ai" | "fallback";
  vendorProfile: VendorProfile | null;
  createdAt: string;
  updatedAt: string;
  isDraftPreview: boolean;
}

export function rowToPublicQuote(row: PublicQuoteRow): PublicQuotePayload {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    serviceType: row.service_type as ServiceType,
    jobName: row.job_name,
    form: row.form_data,
    quote: row.quote_data,
    source: row.source,
    vendorProfile: parseVendorSnapshot(row.vendor_snapshot),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isDraftPreview: row.status === "draft",
  };
}