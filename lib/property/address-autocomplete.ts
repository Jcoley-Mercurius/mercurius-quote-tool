import { fetchGoogleAddressSuggestions, isGooglePlacesConfigured } from "./google-places";
import { getLocalAddressSuggestions } from "./swfl-property-data";
import type { AddressSuggestion } from "./types";

export interface AddressAutocompleteResponse {
  suggestions: AddressSuggestion[];
  provider: "google" | "local" | "mixed";
  googleEnabled: boolean;
}

function mergeSuggestions(
  primary: AddressSuggestion[],
  secondary: AddressSuggestion[]
): AddressSuggestion[] {
  const seen = new Set<string>();
  const merged: AddressSuggestion[] = [];

  for (const item of [...primary, ...secondary]) {
    const key = item.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged.slice(0, 8);
}

export async function getAddressSuggestions(
  query: string
): Promise<AddressAutocompleteResponse> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { suggestions: [], provider: "local", googleEnabled: isGooglePlacesConfigured() };
  }

  const local = getLocalAddressSuggestions(trimmed);
  const googleEnabled = isGooglePlacesConfigured();

  if (!googleEnabled) {
    return {
      suggestions: local,
      provider: "local",
      googleEnabled: false,
    };
  }

  const google = await fetchGoogleAddressSuggestions(trimmed);
  const suggestions = mergeSuggestions(google, local);

  return {
    suggestions,
    provider: google.length > 0 && local.length > 0 ? "mixed" : google.length > 0 ? "google" : "local",
    googleEnabled: true,
  };
}