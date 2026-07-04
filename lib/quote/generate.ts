import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { applyVendorPricing } from "@/lib/vendor/apply-pricing";
import { DEFAULT_VENDOR_PROFILE } from "@/lib/vendor/defaults";
import { toPricingSettings } from "@/lib/vendor/types";
import { buildUserPrompt, getSystemPrompt } from "./prompt";
import { generatedQuoteSchema } from "./schema";
import { generateFallbackQuote } from "./fallback";
import { analyzeQuotePhotos } from "./vision";
import type { PhotoVisionAnalysis } from "./vision-schema";
import { addIdsToQuote, type GenerateQuoteRequest, type GeneratedQuote } from "./types";

function finalizeQuote(
  request: GenerateQuoteRequest,
  payload: Parameters<typeof addIdsToQuote>[0]
): GeneratedQuote {
  const vendor = request.vendor ?? toPricingSettings(DEFAULT_VENDOR_PROFILE);
  const adjusted = applyVendorPricing(payload, vendor);
  return addIdsToQuote(adjusted);
}

function attachPhotoAnalysis(
  quote: GeneratedQuote,
  photoAnalysis: PhotoVisionAnalysis | null | undefined
): GeneratedQuote {
  if (!photoAnalysis) return quote;
  return { ...quote, photoAnalysis };
}

export async function generateQuote(
  request: GenerateQuoteRequest
): Promise<{
  quote: GeneratedQuote;
  source: "ai" | "fallback";
  photoAnalysis: PhotoVisionAnalysis | null;
}> {
  const apiKey = process.env.OPENAI_API_KEY;
  const photoAnalysis =
    request.photoAnalysis ??
    (request.photos?.length
      ? await analyzeQuotePhotos(request.form, request.photos)
      : null);

  const requestWithVision: GenerateQuoteRequest = {
    ...request,
    photoAnalysis,
  };

  if (!apiKey) {
    const payload = generateFallbackQuote(request.form, request.vendor);
    return {
      quote: attachPhotoAnalysis(finalizeQuote(request, payload), photoAnalysis),
      source: "fallback",
      photoAnalysis,
    };
  }

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: generatedQuoteSchema,
      system: getSystemPrompt(requestWithVision),
      prompt: buildUserPrompt(requestWithVision),
      temperature: 0.4,
    });

    return {
      quote: attachPhotoAnalysis(
        finalizeQuote(requestWithVision, object),
        photoAnalysis
      ),
      source: "ai",
      photoAnalysis,
    };
  } catch (error) {
    console.error("AI quote generation failed, using fallback:", error);
    const payload = generateFallbackQuote(request.form, request.vendor);
    return {
      quote: attachPhotoAnalysis(finalizeQuote(request, payload), photoAnalysis),
      source: "fallback",
      photoAnalysis,
    };
  }
}