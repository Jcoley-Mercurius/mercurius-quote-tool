export type PropertyStoryValue = "1" | "2" | "3+";

export type PropertyMatchType = "exact" | "estimated";

export interface PropertyLookupInput {
  address?: string;
  zipCode?: string;
}

export interface PropertyLookupResult {
  found: boolean;
  matchType?: PropertyMatchType;
  squareFootage?: number;
  yearBuilt?: number;
  stories?: PropertyStoryValue;
  zipCode?: string;
  areaName?: string;
  source: string;
  sourceLabel?: string;
  message?: string;
}

export interface AddressSuggestion {
  id: string;
  label: string;
  address: string;
  zipCode?: string;
  secondaryText?: string;
  provider: "google" | "local";
}