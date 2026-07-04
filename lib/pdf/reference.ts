export function generateQuoteReference(generatedAt: string): string {
  const date = new Date(generatedAt);
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = date.getTime().toString(36).slice(-4).toUpperCase();
  return `MQ-${ymd}-${suffix}`;
}

export function formatQuoteDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}