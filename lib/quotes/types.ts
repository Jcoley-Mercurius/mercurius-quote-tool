import type { ServiceType } from "@/components/quote-form/types";
import type { GeneratedQuote, QuoteFormPayload } from "@/lib/quote/types";
import type { VendorProfile } from "@/lib/vendor/types";

export type QuoteStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "changes_requested";

export interface SavedQuote {
  id: string;
  reference: string;
  status: QuoteStatus;
  serviceType: ServiceType;
  jobName: string;
  form: QuoteFormPayload;
  quote: GeneratedQuote;
  source: "ai" | "fallback";
  /** null/undefined = personal workspace */
  organizationId?: string | null;
  /** Vendor branding/pricing frozen at quote creation (or last regeneration) */
  vendorSnapshot?: VendorProfile | null;
  createdAt: string;
  updatedAt: string;
}

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  viewed: "Viewed",
  accepted: "Accepted",
  changes_requested: "Changes Requested",
};

export const QUOTE_STATUS_STYLES: Record<
  QuoteStatus,
  { bg: string; text: string; ring: string }
> = {
  draft: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    ring: "ring-slate-200",
  },
  sent: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-200",
  },
  viewed: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    ring: "ring-violet-200",
  },
  accepted: {
    bg: "bg-mercurius-50",
    text: "text-mercurius-700",
    ring: "ring-mercurius-200",
  },
  changes_requested: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
  },
};
