import type { PropertyRow } from "@/lib/supabase/types";

export function cleanCustomerSearch(value: string): string {
  return value.trim().slice(0, 120);
}

export function postgrestSearchPattern(value: string): string {
  return cleanCustomerSearch(value)
    .replace(/[\\,%_().]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizedPhoneSearch(value: string): string {
  return cleanCustomerSearch(value).replace(/\D/g, "");
}

export function formatCustomerProperty(
  property: Pick<
    PropertyRow,
    "address_line1" | "address_line2" | "city" | "region" | "postal_code"
  >
): string {
  const street = [property.address_line1, property.address_line2]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ");
  const locality = [
    property.city?.trim(),
    property.region?.trim(),
    property.postal_code?.trim(),
  ].filter(Boolean).join(", ").replace(/, ([^,]+)$/, " $1");
  return [street, locality].filter(Boolean).join(", ") || "Address unavailable";
}

export function formatCustomerDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function customerSourceLabel(source: "marketplace" | "direct"): string {
  return source === "marketplace" ? "Marketplace" : "Direct";
}
