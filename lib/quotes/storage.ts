import type { SavedQuote } from "./types";

export const QUOTE_HISTORY_KEY = "mercurius-quote-history";

export function loadQuotesFromStorage(): SavedQuote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(QUOTE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SavedQuote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQuotesToStorage(quotes: SavedQuote[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(QUOTE_HISTORY_KEY, JSON.stringify(quotes));
}