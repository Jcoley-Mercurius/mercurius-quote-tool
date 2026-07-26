import {
  INITIAL_FORM_DATA,
  type QuoteFormData,
  type ServiceType,
} from "@/components/quote-form/types";
import type { OpportunityDetail } from "./types";

const OPPORTUNITY_SERVICE_MAP: Readonly<Record<string, ServiceType>> = {
  hvac: "hvac",
  pool: "pool",
  lawn: "lawn",
  plumbing: "plumbing",
  roofing: "roofing",
  electrical: "electrical",
  general: "general",
};

export function mapOpportunityServiceType(value: string): ServiceType | "" {
  return OPPORTUNITY_SERVICE_MAP[value.trim().toLowerCase()] ?? "";
}

export function opportunityToQuoteFormData(
  opportunity: OpportunityDetail
): QuoteFormData {
  const property = opportunity.property;
  const street = property
    ? [property.addressLine1, property.addressLine2]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(", ")
    : "";
  const locality = property
    ? [property.city, property.region]
      .map((value) => value?.trim())
      .filter(Boolean)
      .join(", ")
    : "";
  const country = property?.countryCode &&
    property.countryCode.toUpperCase() !== "US"
    ? property.countryCode.toUpperCase()
    : "";
  const propertyAddress = [street, locality, country]
    .filter(Boolean)
    .join(" · ");

  return {
    ...INITIAL_FORM_DATA,
    serviceType: mapOpportunityServiceType(opportunity.serviceType),
    propertyAddress,
    zipCode: property?.postalCode?.trim() || "",
    jobDescription: opportunity.description?.trim() || opportunity.title.trim(),
    photos: [],
  };
}
