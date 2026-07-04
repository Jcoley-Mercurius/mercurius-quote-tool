import { describe, expect, it } from "vitest";
import {
  getPhotoForObservation,
  hasLowConfidenceObservations,
  normalizePhotoVisionAnalysis,
} from "./vision-compat";

describe("normalizePhotoVisionAnalysis", () => {
  it("converts legacy string observations to structured items", () => {
    const normalized = normalizePhotoVisionAnalysis({
      summary: "Visible rust on condenser.",
      visibleIssues: ["Corrosion on fins"],
      equipmentIdentified: ["Carrier condenser"],
      suggestedScope: ["Coil cleaning"],
    });

    expect(normalized?.visibleIssues).toEqual([
      { text: "Corrosion on fins", confidence: 75 },
    ]);
    expect(normalized?.equipmentIdentified).toEqual([
      { text: "Carrier condenser", confidence: 75 },
    ]);
    expect(normalized?.suggestedScope).toEqual([{ text: "Coil cleaning" }]);
  });

  it("preserves suggested scope items with photoIndex", () => {
    const normalized = normalizePhotoVisionAnalysis({
      summary: "Condenser needs service.",
      visibleIssues: [],
      equipmentIdentified: [],
      suggestedScope: [
        { text: "Replace drain line", photoIndex: 2 },
      ],
    });

    expect(normalized?.suggestedScope).toEqual([
      { text: "Replace drain line", photoIndex: 2 },
    ]);
  });

  it("preserves structured observations with confidence and photoIndex", () => {
    const normalized = normalizePhotoVisionAnalysis({
      summary: "Drain line damage visible.",
      visibleIssues: [
        { text: "Cracked PVC drain", confidence: 45, photoIndex: 1 },
      ],
      equipmentIdentified: [],
      suggestedScope: [],
    });

    expect(normalized?.visibleIssues).toEqual([
      { text: "Cracked PVC drain", confidence: 45, photoIndex: 1 },
    ]);
  });
});

describe("getPhotoForObservation", () => {
  it("returns the thumbnail matching photoIndex", () => {
    const thumbnails = [
      { thumbnailUrl: "https://example.com/0.webp", index: 0 },
      { thumbnailUrl: "https://example.com/1.webp", index: 1 },
    ];

    expect(getPhotoForObservation(thumbnails, 1)?.thumbnailUrl).toBe(
      "https://example.com/1.webp"
    );
  });

  it("returns undefined when photoIndex is missing", () => {
    const thumbnails = [
      { thumbnailUrl: "https://example.com/0.webp", index: 0 },
    ];

    expect(getPhotoForObservation(thumbnails, undefined)).toBeUndefined();
  });
});

describe("hasLowConfidenceObservations", () => {
  it("flags analyses with observations below threshold", () => {
    const analysis = normalizePhotoVisionAnalysis({
      summary: "Unclear label.",
      visibleIssues: [{ text: "Possible leak", confidence: 50 }],
      equipmentIdentified: [],
      suggestedScope: [],
    });

    expect(analysis).not.toBeNull();
    expect(hasLowConfidenceObservations(analysis!)).toBe(true);
  });
});