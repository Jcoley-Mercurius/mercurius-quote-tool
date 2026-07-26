import { z } from "zod";
import { createEventSchema } from "../envelope";
import {
  offsetTimestampSchema,
  revisionNumberSchema,
  uuidSchema,
} from "../shared";

export const quoteStartedDataSchema = z.strictObject({
  quoteId: uuidSchema,
  opportunityId: uuidSchema,
  revisionNumber: revisionNumberSchema,
  startedAt: offsetTimestampSchema,
});
export const quoteStartedV1Schema = createEventSchema(
  "quote.started", 1, "vendor_os", quoteStartedDataSchema
);
export type QuoteStartedV1 = z.infer<typeof quoteStartedV1Schema>;

