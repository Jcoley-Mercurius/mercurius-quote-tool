import type { PropertyLookupResult } from "./types";

export async function fetchPropertyLookup(input: {
  address?: string;
  zipCode?: string;
}): Promise<PropertyLookupResult> {
  const response = await fetch("/api/property-lookup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: input.address || undefined,
      zipCode: input.zipCode || undefined,
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(
      payload?.error ??
        "Property lookup failed. You can still enter details manually."
    );
  }

  return (await response.json()) as PropertyLookupResult;
}