/** Southwest Florida (Lee County) service area context */

export const SWFL_ZIP_CODES: Record<string, string> = {
  "33901": "Fort Myers",
  "33903": "North Fort Myers",
  "33904": "Cape Coral (SE)",
  "33905": "Fort Myers (E)",
  "33907": "Fort Myers (S)",
  "33908": "Fort Myers (SW)",
  "33909": "Cape Coral (NE)",
  "33912": "Fort Myers (SE)",
  "33913": "Fort Myers (Airport)",
  "33914": "Cape Coral (SW)",
  "33916": "Fort Myers (Downtown)",
  "33917": "North Fort Myers",
  "33919": "Fort Myers (Colonial)",
  "33920": "Alva",
  "33921": "Bokeelia",
  "33922": "Bokeelia",
  "33924": "Fort Myers Beach",
  "33928": "Estero",
  "33931": "Fort Myers Beach",
  "33936": "Lehigh Acres",
  "33955": "Punta Gorda",
  "33966": "Fort Myers (Colonial Blvd)",
  "33967": "Fort Myers (Three Oaks)",
  "33971": "Lehigh Acres",
  "33972": "Lehigh Acres",
  "33973": "Lehigh Acres",
  "33974": "Lehigh Acres",
  "33976": "Lehigh Acres",
  "33990": "Cape Coral (Central)",
  "33991": "Cape Coral (NW)",
  "33993": "Cape Coral (NW)",
};

export function getSwflAreaName(zip: string): string | null {
  return SWFL_ZIP_CODES[zip] ?? null;
}

export function isSwflZip(zip: string): boolean {
  return zip in SWFL_ZIP_CODES;
}

export const SWFL_PROPERTY_HINTS = {
  yearBuilt:
    "Many SWFL homes were built 1970s–1990s — age affects HVAC sizing, electrical panels, and hurricane compliance.",
  stories:
    "Two-story homes in Cape Coral often have different duct runs and pool equipment placement.",
  squareFootage:
    "Typical Cape Coral pool homes range 1,400–2,800 sq ft. Accurate sizing matters for HVAC and roofing.",
} as const;