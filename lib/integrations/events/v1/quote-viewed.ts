import { z } from "zod";
import { createEventSchema } from "../envelope";
import {
  offsetTimestampSchema,
  revisionNumberSchema,
  uuidSchema,
} from "../shared";

export const quoteViewedDataSchema = z.strictObject({
  quoteId: uuidSchema,
  opportunityId: uuidSchema,
  revisionNumber: revisionNumberSchema,
  viewedAt: offsetTimestampSchema,
});
export const quoteViewedV1Schema = createEventSchema(
  "quote.viewed", 1, "vendor_os", quoteViewedDataSchema
);
export type QuoteViewedV1 = z.infer<typeof quoteViewedV1Schema>;

