import { z } from "zod";
import { createEventSchema } from "../envelope";
import {
  offsetTimestampSchema,
  revisionNumberSchema,
  uuidSchema,
} from "../shared";

export const quoteChangeRequestedDataSchema = z.strictObject({
  quoteId: uuidSchema,
  opportunityId: uuidSchema,
  revisionNumber: revisionNumberSchema,
  changeRequestId: uuidSchema,
  requestedAt: offsetTimestampSchema,
});
export const quoteChangeRequestedV1Schema = createEventSchema(
  "quote.change_requested", 1, "vendor_os", quoteChangeRequestedDataSchema
);
export type QuoteChangeRequestedV1 = z.infer<
  typeof quoteChangeRequestedV1Schema
>;

