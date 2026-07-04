import { NextResponse } from "next/server";
import { z } from "zod";
import { generateQuote } from "@/lib/quote/generate";
import { estimatePhotoPayloadBytes } from "@/lib/quote/photos";
import type { ServiceType } from "@/components/quote-form/types";

const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_TOTAL_PHOTO_BYTES = 24 * 1024 * 1024;

const requestSchema = z.object({
  form: z.object({
    serviceType: z.enum([
      "hvac",
      "pool",
      "lawn",
      "plumbing",
      "roofing",
      "electrical",
      "general",
    ]),
    squareFootage: z.string(),
    stories: z.string(),
    yearBuilt: z.string(),
    zipCode: z.string(),
    jobDescription: z.string(),
    photoCount: z.number().min(0),
  }),
  photos: z
    .array(
      z.object({
        dataUrl: z.string().startsWith("data:image/"),
        mimeType: z.string().min(1),
      })
    )
    .max(MAX_PHOTOS)
    .optional(),
  vendor: z
    .object({
      businessName: z.string(),
      laborRatePerHour: z.number(),
      markupPercentage: z.number(),
      materialMarkupPercentage: z.number(),
      minimumJobValue: z.number(),
      travelFee: z.number(),
      includeTravelFee: z.boolean(),
      quoteValidityDays: z.number(),
      priceRangeSpread: z.number(),
    })
    .optional(),
  regenerate: z.boolean().optional(),
  existingQuote: z
    .object({
      lineItems: z.array(
        z.object({
          id: z.string(),
          category: z.string(),
          description: z.string(),
          quantity: z.number(),
          unit: z.string(),
          priceLow: z.number(),
          priceRecommended: z.number(),
          priceHigh: z.number(),
        })
      ),
      assumptions: z.array(z.string()),
      notes: z.array(z.string()),
    })
    .optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const photos = parsed.data.photos ?? [];
    if (photos.length > 0) {
      const totalBytes = estimatePhotoPayloadBytes(photos);
      const oversizedPhoto = photos.find(
        (photo) => estimatePhotoPayloadBytes([photo]) > MAX_PHOTO_BYTES
      );

      if (oversizedPhoto) {
        return NextResponse.json(
          { error: "Each photo must be under 10MB." },
          { status: 400 }
        );
      }

      if (totalBytes > MAX_TOTAL_PHOTO_BYTES) {
        return NextResponse.json(
          { error: "Total photo upload size is too large." },
          { status: 400 }
        );
      }
    }

    const { quote, source, photoAnalysis } = await generateQuote({
      form: {
        ...parsed.data.form,
        serviceType: parsed.data.form.serviceType as ServiceType,
        photoCount: Math.max(parsed.data.form.photoCount, photos.length),
      },
      vendor: parsed.data.vendor,
      photos,
      regenerate: parsed.data.regenerate,
      existingQuote: parsed.data.existingQuote,
    });

    return NextResponse.json({ quote, source, photoAnalysis });
  } catch (error) {
    console.error("Quote generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate quote. Please try again." },
      { status: 500 }
    );
  }
}