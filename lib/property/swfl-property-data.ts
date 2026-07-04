import { getSwflAreaName, isSwflZip, SWFL_ZIP_CODES } from "@/lib/swfl";
import { getPropertySourceLabel } from "./source-labels";
import type {
  AddressSuggestion,
  PropertyLookupResult,
  PropertyStoryValue,
} from "./types";

const SOURCE = "lee-county-assessor-mock";
const SOURCE_LABEL = getPropertySourceLabel(SOURCE);

interface ZipPropertyProfile {
  squareFootage: { min: number; max: number };
  yearBuilt: { min: number; max: number };
  stories: Array<{ value: PropertyStoryValue; weight: number }>;
}

/** Lee County / SWFL zip-level housing stock profiles (MVP proof-of-concept dataset). */
const ZIP_PROFILES: Record<string, ZipPropertyProfile> = {
  // Cape Coral
  "33904": { squareFootage: { min: 1400, max: 2600 }, yearBuilt: { min: 1975, max: 2005 }, stories: [{ value: "1", weight: 70 }, { value: "2", weight: 28 }, { value: "3+", weight: 2 }] },
  "33909": { squareFootage: { min: 1500, max: 2800 }, yearBuilt: { min: 1980, max: 2010 }, stories: [{ value: "1", weight: 65 }, { value: "2", weight: 32 }, { value: "3+", weight: 3 }] },
  "33914": { squareFootage: { min: 1600, max: 3000 }, yearBuilt: { min: 1985, max: 2015 }, stories: [{ value: "1", weight: 60 }, { value: "2", weight: 35 }, { value: "3+", weight: 5 }] },
  "33990": { squareFootage: { min: 1400, max: 2400 }, yearBuilt: { min: 1970, max: 2000 }, stories: [{ value: "1", weight: 75 }, { value: "2", weight: 23 }, { value: "3+", weight: 2 }] },
  "33991": { squareFootage: { min: 1500, max: 2700 }, yearBuilt: { min: 1985, max: 2012 }, stories: [{ value: "1", weight: 68 }, { value: "2", weight: 30 }, { value: "3+", weight: 2 }] },
  "33993": { squareFootage: { min: 1500, max: 2800 }, yearBuilt: { min: 1990, max: 2018 }, stories: [{ value: "1", weight: 62 }, { value: "2", weight: 35 }, { value: "3+", weight: 3 }] },
  // Fort Myers
  "33901": { squareFootage: { min: 1200, max: 2200 }, yearBuilt: { min: 1960, max: 1995 }, stories: [{ value: "1", weight: 80 }, { value: "2", weight: 18 }, { value: "3+", weight: 2 }] },
  "33905": { squareFootage: { min: 1300, max: 2400 }, yearBuilt: { min: 1970, max: 2000 }, stories: [{ value: "1", weight: 72 }, { value: "2", weight: 25 }, { value: "3+", weight: 3 }] },
  "33907": { squareFootage: { min: 1100, max: 2100 }, yearBuilt: { min: 1965, max: 1990 }, stories: [{ value: "1", weight: 78 }, { value: "2", weight: 20 }, { value: "3+", weight: 2 }] },
  "33908": { squareFootage: { min: 1400, max: 2500 }, yearBuilt: { min: 1975, max: 2005 }, stories: [{ value: "1", weight: 70 }, { value: "2", weight: 28 }, { value: "3+", weight: 2 }] },
  "33912": { squareFootage: { min: 1500, max: 2800 }, yearBuilt: { min: 1980, max: 2010 }, stories: [{ value: "1", weight: 65 }, { value: "2", weight: 32 }, { value: "3+", weight: 3 }] },
  "33916": { squareFootage: { min: 1000, max: 1800 }, yearBuilt: { min: 1950, max: 1985 }, stories: [{ value: "1", weight: 85 }, { value: "2", weight: 12 }, { value: "3+", weight: 3 }] },
  "33919": { squareFootage: { min: 1400, max: 2600 }, yearBuilt: { min: 1975, max: 2005 }, stories: [{ value: "1", weight: 68 }, { value: "2", weight: 30 }, { value: "3+", weight: 2 }] },
  // Lehigh Acres
  "33936": { squareFootage: { min: 1200, max: 2200 }, yearBuilt: { min: 1980, max: 2010 }, stories: [{ value: "1", weight: 88 }, { value: "2", weight: 10 }, { value: "3+", weight: 2 }] },
  "33971": { squareFootage: { min: 1300, max: 2400 }, yearBuilt: { min: 1985, max: 2015 }, stories: [{ value: "1", weight: 85 }, { value: "2", weight: 12 }, { value: "3+", weight: 3 }] },
  "33972": { squareFootage: { min: 1300, max: 2400 }, yearBuilt: { min: 1985, max: 2015 }, stories: [{ value: "1", weight: 85 }, { value: "2", weight: 12 }, { value: "3+", weight: 3 }] },
  "33973": { squareFootage: { min: 1400, max: 2500 }, yearBuilt: { min: 1990, max: 2020 }, stories: [{ value: "1", weight: 82 }, { value: "2", weight: 15 }, { value: "3+", weight: 3 }] },
  // Estero / Bonita corridor
  "33928": { squareFootage: { min: 1600, max: 3200 }, yearBuilt: { min: 1995, max: 2024 }, stories: [{ value: "1", weight: 55 }, { value: "2", weight: 40 }, { value: "3+", weight: 5 }] },
  // Fort Myers Beach
  "33931": { squareFootage: { min: 900, max: 1800 }, yearBuilt: { min: 1960, max: 1995 }, stories: [{ value: "1", weight: 90 }, { value: "2", weight: 8 }, { value: "3+", weight: 2 }] },
};

const DEFAULT_SWFL_PROFILE: ZipPropertyProfile = {
  squareFootage: { min: 1300, max: 2500 },
  yearBuilt: { min: 1970, max: 2005 },
  stories: [
    { value: "1", weight: 72 },
    { value: "2", weight: 25 },
    { value: "3+", weight: 3 },
  ],
};

/** Curated demo addresses with assessor-style records for SWFL proof of concept. */
const KNOWN_ADDRESSES: Record<
  string,
  Omit<PropertyLookupResult, "found" | "source" | "sourceLabel" | "matchType">
> = {
  "1234 se 47th terrace cape coral fl 33904": {
    squareFootage: 1850,
    yearBuilt: 1987,
    stories: "1",
    zipCode: "33904",
    areaName: "Cape Coral (SE)",
  },
  "2841 del prado blvd s cape coral fl 33904": {
    squareFootage: 2140,
    yearBuilt: 1994,
    stories: "2",
    zipCode: "33904",
    areaName: "Cape Coral (SE)",
  },
  "5624 8th street w lehigh acres fl 33971": {
    squareFootage: 1680,
    yearBuilt: 2003,
    stories: "1",
    zipCode: "33971",
    areaName: "Lehigh Acres",
  },
  "13450 summerlin rd fort myers fl 33919": {
    squareFootage: 1925,
    yearBuilt: 1982,
    stories: "1",
    zipCode: "33919",
    areaName: "Fort Myers (Colonial)",
  },
};

/** Display-formatted addresses for local autocomplete fallback. */
export const DEMO_ADDRESS_SUGGESTIONS: AddressSuggestion[] = [
  {
    id: "demo-1234-se-47th",
    label: "1234 SE 47th Terrace, Cape Coral, FL 33904",
    address: "1234 SE 47th Terrace, Cape Coral, FL 33904",
    zipCode: "33904",
    secondaryText: "Cape Coral (SE)",
    provider: "local",
  },
  {
    id: "demo-del-prado",
    label: "2841 Del Prado Blvd S, Cape Coral, FL 33904",
    address: "2841 Del Prado Blvd S, Cape Coral, FL 33904",
    zipCode: "33904",
    secondaryText: "Cape Coral (SE)",
    provider: "local",
  },
  {
    id: "demo-lehigh",
    label: "5624 8th Street W, Lehigh Acres, FL 33971",
    address: "5624 8th Street W, Lehigh Acres, FL 33971",
    zipCode: "33971",
    secondaryText: "Lehigh Acres",
    provider: "local",
  },
  {
    id: "demo-summerlin",
    label: "13450 Summerlin Rd, Fort Myers, FL 33919",
    address: "13450 Summerlin Rd, Fort Myers, FL 33919",
    zipCode: "33919",
    secondaryText: "Fort Myers (Colonial)",
    provider: "local",
  },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function pickInRange(min: number, max: number, seed: number): number {
  const span = max - min + 1;
  return min + (seed % span);
}

function pickWeightedStory(
  options: Array<{ value: PropertyStoryValue; weight: number }>,
  seed: number
): PropertyStoryValue {
  const total = options.reduce((sum, option) => sum + option.weight, 0);
  let threshold = seed % total;
  for (const option of options) {
    threshold -= option.weight;
    if (threshold < 0) {
      return option.value;
    }
  }
  return options[0]?.value ?? "1";
}

function getProfileForZip(zip: string): ZipPropertyProfile {
  return ZIP_PROFILES[zip] ?? DEFAULT_SWFL_PROFILE;
}

export function normalizeAddress(address: string): string {
  return address
    .toLowerCase()
    .replace(/[.,#]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractZipFromAddress(address: string): string | null {
  const match = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return match?.[1] ?? null;
}

export function lookupSwflProperty(
  address: string | undefined,
  zipCode: string | undefined
): PropertyLookupResult {
  const normalizedAddress = address ? normalizeAddress(address) : "";
  const knownRecord = normalizedAddress
    ? KNOWN_ADDRESSES[normalizedAddress]
    : undefined;

  if (knownRecord) {
    return {
      found: true,
      matchType: "exact",
      ...knownRecord,
      source: SOURCE,
      sourceLabel: SOURCE_LABEL,
      message: `Exact property record found for ${knownRecord.areaName ?? "this address"}. Review and adjust if needed.`,
    };
  }

  const zipFromAddress = address ? extractZipFromAddress(address) : null;
  const resolvedZip = zipFromAddress ?? zipCode?.trim() ?? "";

  if (!/^\d{5}$/.test(resolvedZip)) {
    return {
      found: false,
      source: SOURCE,
      sourceLabel: SOURCE_LABEL,
      message: "Enter a full address with zip code, or a 5-digit SWFL zip code.",
    };
  }

  if (!isSwflZip(resolvedZip)) {
    return {
      found: false,
      source: SOURCE,
      sourceLabel: SOURCE_LABEL,
      message:
        "No property records in our SWFL dataset for this zip. Enter details manually.",
    };
  }

  const profile = getProfileForZip(resolvedZip);
  const seedSource = normalizedAddress || resolvedZip;
  const seed = hashString(seedSource);
  const areaName = getSwflAreaName(resolvedZip) ?? "Southwest Florida";

  const hasSpecificAddress = Boolean(normalizedAddress);

  return {
    found: true,
    matchType: "estimated",
    squareFootage: pickInRange(
      profile.squareFootage.min,
      profile.squareFootage.max,
      seed
    ),
    yearBuilt: pickInRange(profile.yearBuilt.min, profile.yearBuilt.max, seed >> 3),
    stories: pickWeightedStory(profile.stories, seed >> 5),
    zipCode: resolvedZip,
    areaName,
    source: SOURCE,
    sourceLabel: SOURCE_LABEL,
    message: hasSpecificAddress
      ? `No exact record for this address — filled with a typical ${areaName} estimate. Please verify below.`
      : `Filled with a typical ${areaName} estimate based on zip code. Please verify below.`,
  };
}

export function getLocalAddressSuggestions(query: string): AddressSuggestion[] {
  const normalized = query.trim().toLowerCase();
  if (normalized.length < 2) return [];

  const suggestions: AddressSuggestion[] = [];

  for (const demo of DEMO_ADDRESS_SUGGESTIONS) {
    if (
      demo.label.toLowerCase().includes(normalized) ||
      demo.address.toLowerCase().includes(normalized)
    ) {
      suggestions.push(demo);
    }
  }

  for (const [zip, areaName] of Object.entries(SWFL_ZIP_CODES)) {
    if (
      zip.startsWith(normalized) ||
      areaName.toLowerCase().includes(normalized)
    ) {
      suggestions.push({
        id: `zip-${zip}`,
        label: `${areaName}, FL ${zip}`,
        address: `${areaName}, FL ${zip}`,
        zipCode: zip,
        secondaryText: "SWFL service area",
        provider: "local",
      });
    }
  }

  const seen = new Set<string>();
  return suggestions
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    })
    .slice(0, 8);
}