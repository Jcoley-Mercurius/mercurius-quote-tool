import { z } from "zod";
import { createEventSchema } from "../envelope";
import {
  offsetTimestampSchema,
  revisionNumberSchema,
  uuidSchema,
} from "../shared";

export const quoteSentDataSchema = z.strictObject({
  quoteId: uuidSchema,
  opportunityId: uuidSchema,
  revisionNumber: revisionNumberSchema,
  sentAt: offsetTimestampSchema,
  expiresAt: offsetTimestampSchema,
});
export const quoteSentV1Schema = createEventSchema(
  "quote.sent", 1, "vendor_os", quoteSentDataSchema
);
export type QuoteSentV1 = z.infer<typeof quoteSentV1Schema>;

