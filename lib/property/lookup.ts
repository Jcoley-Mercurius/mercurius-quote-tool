import { lookupSwflProperty } from "./swfl-property-data";
import type { PropertyLookupInput, PropertyLookupResult } from "./types";

export { extractZipFromAddress, normalizeAddress } from "./swfl-property-data";

export function lookupProperty(
  input: PropertyLookupInput
): PropertyLookupResult {
  const address = input.address?.trim();
  const zipCode = input.zipCode?.trim();

  if (!address && !zipCode) {
    return {
      found: false,
      source: "lee-county-assessor-mock",
      sourceLabel: "Lee County Property Records (demo)",
      message: "Enter a property address or zip code to look up.",
    };
  }

  return lookupSwflProperty(address, zipCode);
}