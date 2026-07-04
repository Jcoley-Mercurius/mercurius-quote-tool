import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { SERVICE_OPTIONS } from "@/components/quote-form/types";
import { getSwflAreaName } from "@/lib/swfl";
import type { QuoteFormPayload, QuotePhotoInput } from "./types";
import { observationText, scopeItemText } from "./vision-compat";
import {
  photoVisionAnalysisSchema,
  type PhotoVisionAnalysis,
} from "./vision-schema";

const VISION_SYSTEM_PROMPT = `You are a home-service field inspector assisting vendors in Southwest Florida (Lee County).

Analyze job site photos for a quote request. Be practical and conservative:
- Only describe what is clearly visible; say when something is unclear or not readable
- Note visible damage, corrosion, leaks, wear, code concerns, or safety issues
- Identify equipment types and nameplate details only when legible in the image
- Suggest realistic scope items a local contractor might quote
- Do not invent model numbers, serial numbers, or conditions you cannot see
- Keep language professional and useful for a homeowner-facing quote
- For each visible issue and equipment item, include a confidence score (0-100):
  90-100 = clearly visible/readable, 70-89 = likely but partially obscured,
  40-69 = uncertain inference, below 40 = speculative — prefer omitting instead
- Photos are provided in order starting at index 0. When an observation or
  suggested scope item clearly comes from a specific photo, set photoIndex to
  that 0-based index`;

function buildVisionUserPrompt(form: QuoteFormPayload, photoCount: number): string {
  const serviceLabel =
    SERVICE_OPTIONS.find((s) => s.id === form.serviceType)?.label ??
    form.serviceType;
  const areaName = getSwflAreaName(form.zipCode) ?? "Southwest Florida";

  const photoIndexHint =
    photoCount > 1
      ? `Photos are numbered 0 to ${photoCount - 1} in upload order. Reference photoIndex when an observation is clearly tied to one image.\n\n`
      : "";

  return `Analyze ${photoCount} job photo(s) for this SWFL home service quote request.

${photoIndexHint}Service type: ${serviceLabel}
Property: ${form.squareFootage} sq ft, ${form.stories === "3+" ? "3+ stories" : `${form.stories}-story`}, built ${form.yearBuilt}
Location: ${form.zipCode} (${areaName})
Vendor job description: ${form.jobDescription}

Return concise, quote-ready observations that help scope labor, materials, and assumptions.`;
}

export function buildPhotoVisionPromptSection(
  analysis: PhotoVisionAnalysis
): string {
  const sections: string[] = [
    "## Photo Analysis (from uploaded job photos)",
    `Summary: ${analysis.summary}`,
  ];

  const formatObservation = (item: PhotoVisionAnalysis["visibleIssues"][number]) => {
    const photoHint =
      item.photoIndex !== undefined ? `, photo ${item.photoIndex}` : "";
    return `- ${observationText(item)} (confidence ${item.confidence}%${photoHint})`;
  };

  if (analysis.visibleIssues.length > 0) {
    sections.push(
      `Visible issues:\n${analysis.visibleIssues.map(formatObservation).join("\n")}`
    );
  }

  if (analysis.equipmentIdentified.length > 0) {
    sections.push(
      `Equipment identified:\n${analysis.equipmentIdentified.map(formatObservation).join("\n")}`
    );
  }

  if (analysis.suggestedScope.length > 0) {
    sections.push(
      `Suggested scope from photos:\n${analysis.suggestedScope
        .map((item) => {
          const photoHint =
            item.photoIndex !== undefined ? `, photo ${item.photoIndex}` : "";
          return `- ${scopeItemText(item)}${photoHint}`;
        })
        .join("\n")}`
    );
  }

  sections.push(
    "Use these photo observations to improve line items, assumptions, notes, and alerts. Do not contradict clear photo evidence."
  );

  return `\n\n${sections.join("\n\n")}`;
}

export async function analyzeQuotePhotos(
  form: QuoteFormPayload,
  photos: QuotePhotoInput[]
): Promise<PhotoVisionAnalysis | null> {
  if (photos.length === 0) return null;

  const imageParts = photos.map((photo) => ({
    type: "image" as const,
    image: photo.dataUrl,
    mediaType: photo.mimeType,
  }));

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: photoVisionAnalysisSchema,
      system: VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildVisionUserPrompt(form, photos.length) },
            ...imageParts,
          ],
        },
      ],
      temperature: 0.2,
    });

    return object;
  } catch (error) {
    console.error("Photo vision analysis failed:", error);
    return null;
  }
}