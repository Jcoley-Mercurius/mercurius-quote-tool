import { z } from "zod";
import { createEventSchema } from "../envelope";
import {
  offsetTimestampSchema,
  revisionNumberSchema,
  uuidSchema,
} from "../shared";

export const quoteExpiredDataSchema = z.strictObject({
  quoteId: uuidSchema,
  opportunityId: uuidSchema,
  revisionNumber: revisionNumberSchema,
  expiredAt: offsetTimestampSchema,
});
export const quoteExpiredV1Schema = createEventSchema(
  "quote.expired", 1, "vendor_os", quoteExpiredDataSchema
);
export type QuoteExpiredV1 = z.infer<typeof quoteExpiredV1Schema>;

