import { z } from "zod";
import { createEventSchema } from "../envelope";
import {
  generatedQuoteSourceSchema,
  offsetTimestampSchema,
  revisionNumberSchema,
  uuidSchema,
} from "../shared";

export const quoteGeneratedDataSchema = z.strictObject({
  quoteId: uuidSchema,
  opportunityId: uuidSchema,
  revisionNumber: revisionNumberSchema,
  generatedAt: offsetTimestampSchema,
  source: generatedQuoteSourceSchema,
});
export const quoteGeneratedV1Schema = createEventSchema(
  "quote.generated", 1, "vendor_os", quoteGeneratedDataSchema
);
export type QuoteGeneratedV1 = z.infer<typeof quoteGeneratedV1Schema>;

