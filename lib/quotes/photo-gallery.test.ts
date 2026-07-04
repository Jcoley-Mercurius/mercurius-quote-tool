import { describe, expect, it } from "vitest";
import {
  collectGalleryPhotos,
  filterQuotesForGallery,
  matchesGallerySearch,
  paginateGalleryPhotos,
} from "./photo-gallery";
import type { SavedQuote } from "./types";

function makeQuote(
  overrides: Partial<SavedQuote> & Pick<SavedQuote, "id">
): SavedQuote {
  const serviceType = overrides.serviceType ?? "hvac";
  return {
    id: overrides.id,
    reference: overrides.reference ?? "MQ-2026-0001",
    status: overrides.status ?? "draft",
    serviceType,
    jobName: overrides.jobName ?? "AC repair",
    form: {
      serviceType,
      squareFootage: "2000",
      stories: "1",
      yearBuilt: "1995",
      zipCode: "33901",
      jobDescription: overrides.form?.jobDescription ?? "Fix AC unit",
      photoCount: 1,
    },
    quote: overrides.quote ?? {
      title: "AC repair",
      propertyContext: "Single-family home",
      validityDays: 30,
      lineItems: [],
      assumptions: [],
      notes: [],
      alerts: [],
      generatedAt: "2026-01-01T00:00:00.000Z",
    },
    source: "ai",
    createdAt: overrides.createdAt ?? "2026-01-01T00:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-01-02T00:00:00.000Z",
    organizationId: overrides.organizationId,
  };
}

describe("collectGalleryPhotos", () => {
  it("flattens thumbnails from quotes with photos", () => {
    const items = collectGalleryPhotos([
      makeQuote({
        id: "q1",
        jobName: "Pool pump",
        quote: {
          title: "Pool pump",
          propertyContext: "Pool",
          validityDays: 30,
          lineItems: [],
          assumptions: [],
          notes: [],
          alerts: [],
          generatedAt: "2026-01-01T00:00:00.000Z",
          photoThumbnails: [
            {
              thumbnailUrl: "https://example.com/1.webp",
              originalPath: "user/photos/q1/originals/0.jpg",
              index: 0,
            },
            {
              thumbnailUrl: "https://example.com/2.webp",
              originalPath: "user/photos/q1/originals/1.jpg",
              index: 1,
            },
          ],
        },
      }),
    ]);

    expect(items).toHaveLength(2);
    expect(items[0]?.quoteId).toBe("q1");
    expect(items[0]?.photo.index).toBe(0);
    expect(items[0]?.quotePhotoCount).toBe(2);
  });

  it("sorts by quote updatedAt descending", () => {
    const items = collectGalleryPhotos([
      makeQuote({
        id: "older",
        updatedAt: "2026-01-01T00:00:00.000Z",
        quote: {
          title: "Older",
          propertyContext: "Home",
          validityDays: 30,
          lineItems: [],
          assumptions: [],
          notes: [],
          alerts: [],
          generatedAt: "2026-01-01T00:00:00.000Z",
          photoThumbnails: [
            { thumbnailUrl: "https://example.com/old.webp", index: 0 },
          ],
        },
      }),
      makeQuote({
        id: "newer",
        updatedAt: "2026-02-01T00:00:00.000Z",
        quote: {
          title: "Newer",
          propertyContext: "Home",
          validityDays: 30,
          lineItems: [],
          assumptions: [],
          notes: [],
          alerts: [],
          generatedAt: "2026-02-01T00:00:00.000Z",
          photoThumbnails: [
            { thumbnailUrl: "https://example.com/new.webp", index: 0 },
          ],
        },
      }),
    ]);

    expect(items[0]?.quoteId).toBe("newer");
  });

  it("skips quotes without thumbnails", () => {
    const items = collectGalleryPhotos([makeQuote({ id: "no-photos" })]);

    expect(items).toHaveLength(0);
  });
});

describe("matchesGallerySearch", () => {
  it("matches quote reference, job name, description, and service label", () => {
    const quote = makeQuote({
      id: "abc-123",
      reference: "MQ-2026-0042",
      jobName: "Pool heater install",
      serviceType: "pool",
      form: {
        serviceType: "pool",
        squareFootage: "2000",
        stories: "1",
        yearBuilt: "1995",
        zipCode: "33901",
        jobDescription: "Replace old pool heater",
        photoCount: 1,
      },
    });

    expect(matchesGallerySearch(quote, "mq-2026")).toBe(true);
    expect(matchesGallerySearch(quote, "abc-123")).toBe(true);
    expect(matchesGallerySearch(quote, "pool heater")).toBe(true);
    expect(matchesGallerySearch(quote, "plumbing")).toBe(false);
  });
});

describe("filterQuotesForGallery", () => {
  it("filters by multiple service types, status, date range, and search", () => {
    const quotes = [
      makeQuote({
        id: "match",
        serviceType: "pool",
        status: "sent",
        jobName: "Pool resurfacing",
        updatedAt: "2026-02-15T12:00:00.000Z",
        quote: {
          title: "Pool",
          propertyContext: "Pool",
          validityDays: 30,
          lineItems: [],
          assumptions: [],
          notes: [],
          alerts: [],
          generatedAt: "2026-02-15T12:00:00.000Z",
          photoThumbnails: [
            { thumbnailUrl: "https://example.com/pool.webp", index: 0 },
          ],
        },
      }),
      makeQuote({
        id: "hvac-match",
        serviceType: "hvac",
        status: "sent",
        jobName: "AC replacement",
        updatedAt: "2026-02-16T12:00:00.000Z",
        quote: {
          title: "AC",
          propertyContext: "Home",
          validityDays: 30,
          lineItems: [],
          assumptions: [],
          notes: [],
          alerts: [],
          generatedAt: "2026-02-16T12:00:00.000Z",
          photoThumbnails: [
            { thumbnailUrl: "https://example.com/hvac.webp", index: 0 },
          ],
        },
      }),
      makeQuote({
        id: "wrong-service",
        serviceType: "roofing",
        status: "sent",
        updatedAt: "2026-02-15T12:00:00.000Z",
      }),
      makeQuote({
        id: "wrong-status",
        serviceType: "pool",
        status: "draft",
        updatedAt: "2026-02-15T12:00:00.000Z",
      }),
    ];

    const filtered = filterQuotesForGallery(quotes, {
      serviceTypes: ["pool", "hvac"],
      status: "sent",
      dateFrom: "2026-02-01",
      dateTo: "2026-02-28",
      search: "replacement",
    });

    expect(filtered.map((quote) => quote.id)).toEqual(["hvac-match"]);
  });
});

describe("paginateGalleryPhotos", () => {
  it("returns a single page when items fit", () => {
    const result = paginateGalleryPhotos([1, 2, 3], 1, 24);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.totalPages).toBe(1);
  });

  it("paginates large result sets", () => {
    const items = Array.from({ length: 30 }, (_, index) => index);
    const page1 = paginateGalleryPhotos(items, 1, 24);
    const page2 = paginateGalleryPhotos(items, 2, 24);

    expect(page1.items).toHaveLength(24);
    expect(page2.items).toHaveLength(6);
    expect(page1.totalPages).toBe(2);
  });
});