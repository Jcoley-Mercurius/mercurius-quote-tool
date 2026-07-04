import type { Workspace } from "@/lib/organizations/types";
import { parseVendorSnapshot } from "@/lib/quotes/vendor-snapshot";
import type { GeneratedQuote, QuoteFormPayload } from "@/lib/quote/types";
import type { QuoteStatus, SavedQuote } from "@/lib/quotes/types";
import type { VendorProfile } from "@/lib/vendor/types";

export interface VendorProfileRow {
  id: string;
  user_id: string;
  organization_id: string | null;
  business_name: string;
  tagline: string;
  phone: string;
  email: string;
  labor_rate_per_hour: number;
  markup_percentage: number;
  material_markup_percentage: number;
  minimum_job_value: number;
  travel_fee: number;
  include_travel_fee: boolean;
  quote_validity_days: number;
  price_range_spread: number;
  logo_url: string | null;
  logo_data_url: string | null;
  show_powered_by_mercurius: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuoteRow {
  id: string;
  user_id: string;
  organization_id: string | null;
  reference: string;
  status: QuoteStatus;
  service_type: string;
  job_name: string;
  form_data: QuoteFormPayload;
  quote_data: GeneratedQuote;
  source: "ai" | "fallback";
  vendor_snapshot?: VendorProfile | null;
  created_at: string;
  updated_at: string;
}

export function vendorProfileToRow(
  userId: string,
  profile: VendorProfile,
  workspace: Workspace
): Omit<VendorProfileRow, "id" | "created_at" | "updated_at"> {
  return {
    user_id: userId,
    organization_id:
      workspace.type === "organization" ? workspace.organizationId : null,
    business_name: profile.businessName,
    tagline: profile.tagline,
    phone: profile.phone,
    email: profile.email,
    labor_rate_per_hour: profile.laborRatePerHour,
    markup_percentage: profile.markupPercentage,
    material_markup_percentage: profile.materialMarkupPercentage,
    minimum_job_value: profile.minimumJobValue,
    travel_fee: profile.travelFee,
    include_travel_fee: profile.includeTravelFee,
    quote_validity_days: profile.quoteValidityDays,
    price_range_spread: profile.priceRangeSpread,
    logo_url: profile.logoUrl,
    logo_data_url: profile.logoUrl ? null : profile.logoDataUrl,
    show_powered_by_mercurius: profile.showPoweredByMercurius,
  };
}

export function rowToVendorProfile(row: VendorProfileRow): VendorProfile {
  return {
    businessName: row.business_name,
    tagline: row.tagline,
    phone: row.phone,
    email: row.email,
    laborRatePerHour: Number(row.labor_rate_per_hour),
    markupPercentage: Number(row.markup_percentage),
    materialMarkupPercentage: Number(row.material_markup_percentage),
    minimumJobValue: Number(row.minimum_job_value),
    travelFee: Number(row.travel_fee),
    includeTravelFee: row.include_travel_fee,
    quoteValidityDays: row.quote_validity_days,
    priceRangeSpread: Number(row.price_range_spread),
    logoUrl: row.logo_url ?? null,
    logoDataUrl: row.logo_data_url ?? null,
    showPoweredByMercurius: row.show_powered_by_mercurius,
  };
}

export function savedQuoteToRow(
  userId: string,
  quote: SavedQuote
): Omit<QuoteRow, "created_at" | "updated_at"> {
  return {
    id: quote.id,
    user_id: userId,
    organization_id: quote.organizationId ?? null,
    reference: quote.reference,
    status: quote.status,
    service_type: quote.serviceType,
    job_name: quote.jobName,
    form_data: quote.form,
    quote_data: quote.quote,
    source: quote.source,
    vendor_snapshot: quote.vendorSnapshot ?? null,
  };
}

export function rowToSavedQuote(row: QuoteRow): SavedQuote {
  return {
    id: row.id,
    reference: row.reference,
    status: row.status,
    serviceType: row.service_type as SavedQuote["serviceType"],
    jobName: row.job_name,
    form: row.form_data,
    quote: row.quote_data,
    source: row.source,
    organizationId: row.organization_id,
    vendorSnapshot: parseVendorSnapshot(row.vendor_snapshot),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}