import { z } from "zod";

export const quoteLineItemSchema = z.object({
  category: z
    .string()
    .describe("Category: Labor, Materials, Equipment, Permit, or Other"),
  description: z.string().describe("Clear line item description for the homeowner"),
  quantity: z.number().min(0).describe("Quantity of units"),
  unit: z.string().describe("Unit type: hour, each, sq ft, ton, linear ft, etc."),
  priceLow: z.number().min(0).describe("Low-end total for this line item in USD"),
  priceRecommended: z
    .number()
    .min(0)
    .describe("Recommended total for this line item in USD"),
  priceHigh: z.number().min(0).describe("High-end total for this line item in USD"),
});

export const quoteAlertSchema = z.object({
  type: z.enum(["warning", "suggestion", "info"]),
  title: z.string(),
  message: z.string(),
});

export const generatedQuoteSchema = z.object({
  title: z.string().describe("Short professional quote title"),
  propertyContext: z
    .string()
    .describe(
      'Human-readable property summary, e.g. "Based on a 2,200 sq ft, 2-story home built in 1992 in Cape Coral"'
    ),
  lineItems: z
    .array(quoteLineItemSchema)
    .min(3)
    .max(12)
    .describe("Detailed line items with SWFL-appropriate pricing"),
  assumptions: z
    .array(z.string())
    .min(2)
    .max(8)
    .describe("Key assumptions included in this quote"),
  notes: z
    .array(z.string())
    .min(1)
    .max(6)
    .describe("Professional notes for the vendor or homeowner"),
  alerts: z
    .array(quoteAlertSchema)
    .min(1)
    .max(6)
    .describe("SWFL-specific warnings or suggestions based on property data"),
  validityDays: z.number().min(7).max(90).describe("Quote validity period in days"),
});

export type GeneratedQuotePayload = z.infer<typeof generatedQuoteSchema>;
export type QuoteLineItemPayload = z.infer<typeof quoteLineItemSchema>;
export type QuoteAlertPayload = z.infer<typeof quoteAlertSchema>;