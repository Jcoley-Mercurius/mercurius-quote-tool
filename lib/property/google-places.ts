import type { AddressSuggestion } from "./types";

/** Cape Coral / Fort Myers centroid for SWFL-focused address bias. */
const SWFL_LOCATION_BIAS = {
  circle: {
    center: { latitude: 26.6406, longitude: -81.8723 },
    radius: 80_000,
  },
};

interface GoogleAutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId?: string;
      text?: { text?: string };
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
    };
  }>;
}

export function isGooglePlacesConfigured(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}

export async function fetchGoogleAddressSuggestions(
  query: string
): Promise<AddressSuggestion[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!apiKey || query.trim().length < 3) {
    return [];
  }

  const response = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
      },
      body: JSON.stringify({
        input: query,
        includedRegionCodes: ["us"],
        includedPrimaryTypes: ["street_address", "premise", "subpremise"],
        locationBias: SWFL_LOCATION_BIAS,
      }),
      signal: AbortSignal.timeout(4_000),
    }
  );

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as GoogleAutocompleteResponse;

  const suggestions: AddressSuggestion[] = [];

  for (const [index, suggestion] of (payload.suggestions ?? []).entries()) {
    const prediction = suggestion.placePrediction;
    const label =
      prediction?.text?.text ??
      prediction?.structuredFormat?.mainText?.text ??
      "";
    if (!label) continue;

    const zipMatch = label.match(/\b(\d{5})(?:-\d{4})?\b/);

    suggestions.push({
      id: prediction?.placeId ?? `google-${index}`,
      label,
      address: label,
      zipCode: zipMatch?.[1],
      secondaryText: prediction?.structuredFormat?.secondaryText?.text,
      provider: "google",
    });

    if (suggestions.length >= 8) break;
  }

  return suggestions;
}