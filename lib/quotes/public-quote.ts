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
  /** Server-computed expiry timestamp (created_at + validityDays days).
   *  Present in migration 016+; may be undefined for older Supabase versions. */
  expires_at?: string | null;
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
  /** ISO timestamp at which this quote expires. Computed server-side. */
  expiresAt: string;
  /** True when now() is past expiresAt (server-authoritative). */
  isExpired: boolean;
}

export function rowToPublicQuote(row: PublicQuoteRow): PublicQuotePayload {
  // Derive expiresAt from server field if present; fall back to client-side calc.
  const validityDays: number = (row.quote_data as GeneratedQuote).validityDays ?? 30;
  const expiresAt: string =
    row.expires_at ??
    new Date(
      new Date(row.created_at).getTime() + validityDays * 24 * 60 * 60 * 1000
    ).toISOString();

  const isExpired = Date.now() > new Date(expiresAt).getTime();

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
    expiresAt,
    isExpired,
  };
}
