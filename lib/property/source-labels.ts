const PROPERTY_SOURCE_LABELS: Record<string, string> = {
  "lee-county-assessor-mock": "Lee County Property Records (demo)",
  "google-places": "Google Places",
};

export function getPropertySourceLabel(source: string): string {
  return PROPERTY_SOURCE_LABELS[source] ?? source;
}