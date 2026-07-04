import type { QuotePhotoThumbnail } from "./types";
import type {
  PhotoVisionAnalysis,
  PhotoVisionObservation,
  PhotoVisionScopeItem,
} from "./vision-schema";

const DEFAULT_LEGACY_CONFIDENCE = 75;
export const LOW_CONFIDENCE_THRESHOLD = 60;

function isObservation(value: unknown): value is PhotoVisionObservation {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof (value as PhotoVisionObservation).text === "string" &&
    "confidence" in value &&
    typeof (value as PhotoVisionObservation).confidence === "number"
  );
}

function isScopeItem(value: unknown): value is PhotoVisionScopeItem {
  return (
    typeof value === "object" &&
    value !== null &&
    "text" in value &&
    typeof (value as PhotoVisionScopeItem).text === "string"
  );
}

function normalizePhotoIndex(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    return undefined;
  }
  return value;
}

function normalizeObservations(
  items: unknown,
  fallbackConfidence = DEFAULT_LEGACY_CONFIDENCE
): PhotoVisionObservation[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): PhotoVisionObservation | null => {
      if (typeof item === "string" && item.trim()) {
        return { text: item.trim(), confidence: fallbackConfidence };
      }
      if (isObservation(item) && item.text.trim()) {
        const observation: PhotoVisionObservation = {
          text: item.text.trim(),
          confidence: Math.min(100, Math.max(0, Math.round(item.confidence))),
        };
        const photoIndex = normalizePhotoIndex(item.photoIndex);
        if (photoIndex !== undefined) {
          observation.photoIndex = photoIndex;
        }
        return observation;
      }
      return null;
    })
    .filter((item): item is PhotoVisionObservation => item !== null);
}

function normalizeSuggestedScope(items: unknown): PhotoVisionScopeItem[] {
  if (!Array.isArray(items)) return [];

  return items
    .map((item): PhotoVisionScopeItem | null => {
      if (typeof item === "string" && item.trim()) {
        return { text: item.trim() };
      }
      if (isScopeItem(item) && item.text.trim()) {
        const scopeItem: PhotoVisionScopeItem = { text: item.text.trim() };
        const photoIndex = normalizePhotoIndex(item.photoIndex);
        if (photoIndex !== undefined) {
          scopeItem.photoIndex = photoIndex;
        }
        return scopeItem;
      }
      return null;
    })
    .filter((item): item is PhotoVisionScopeItem => item !== null);
}

export function normalizePhotoVisionAnalysis(
  raw: unknown
): PhotoVisionAnalysis | null {
  if (!raw || typeof raw !== "object") return null;

  const data = raw as Partial<PhotoVisionAnalysis> & {
    visibleIssues?: unknown;
    equipmentIdentified?: unknown;
    suggestedScope?: unknown;
  };

  if (typeof data.summary !== "string" || !data.summary.trim()) {
    return null;
  }

  return {
    summary: data.summary.trim(),
    visibleIssues: normalizeObservations(data.visibleIssues),
    equipmentIdentified: normalizeObservations(data.equipmentIdentified),
    suggestedScope: normalizeSuggestedScope(data.suggestedScope),
  };
}

export function observationText(item: PhotoVisionObservation): string {
  return item.text;
}

export function scopeItemText(item: PhotoVisionScopeItem): string {
  return item.text;
}

export function getPhotoForObservation(
  thumbnails: QuotePhotoThumbnail[] | undefined,
  photoIndex: number | undefined
): QuotePhotoThumbnail | undefined {
  if (!thumbnails?.length || photoIndex === undefined) return undefined;
  return (
    thumbnails.find((photo) => photo.index === photoIndex) ??
    thumbnails[photoIndex]
  );
}

export function hasLowConfidenceObservations(
  analysis: PhotoVisionAnalysis
): boolean {
  const observations = [
    ...analysis.visibleIssues,
    ...analysis.equipmentIdentified,
  ];
  return observations.some((item) => item.confidence < LOW_CONFIDENCE_THRESHOLD);
}

export function confidenceLevel(
  score: number
): "high" | "medium" | "low" {
  if (score >= 80) return "high";
  if (score >= LOW_CONFIDENCE_THRESHOLD) return "medium";
  return "low";
}