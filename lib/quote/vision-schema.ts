import { z } from "zod";

export const photoVisionObservationSchema = z.object({
  text: z.string().describe("Observation text"),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Confidence 0-100: how clearly this is visible/readable in the photos"
    ),
  photoIndex: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      "0-based index of the photo where this observation is most visible; omit if unclear or spans multiple photos"
    ),
});

export type PhotoVisionObservation = z.infer<typeof photoVisionObservationSchema>;

export const photoVisionScopeItemSchema = z.object({
  text: z.string().describe("Suggested scope or line item"),
  photoIndex: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe(
      "0-based index of the photo that best supports this scope suggestion; omit if unclear"
    ),
});

export type PhotoVisionScopeItem = z.infer<typeof photoVisionScopeItemSchema>;

export const photoVisionAnalysisSchema = z.object({
  summary: z
    .string()
    .describe(
      "Brief plain-language summary of what is visible across all photos"
    ),
  visibleIssues: z
    .array(photoVisionObservationSchema)
    .min(0)
    .max(8)
    .describe("Visible damage, wear, defects, or safety concerns"),
  equipmentIdentified: z
    .array(photoVisionObservationSchema)
    .min(0)
    .max(6)
    .describe(
      "Equipment types, brands, or model info visible on labels/nameplates when readable"
    ),
  suggestedScope: z
    .array(photoVisionScopeItemSchema)
    .min(0)
    .max(8)
    .describe(
      "Reasonable work scope or line-item ideas based on what the photos show"
    ),
});

export type PhotoVisionAnalysis = z.infer<typeof photoVisionAnalysisSchema>;