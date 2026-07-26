import { z } from "zod";
import { createEventSchema } from "../envelope";
import {
  currencySchema,
  minorAmountSchema,
  offsetTimestampSchema,
  revisionNumberSchema,
  uuidSchema,
} from "../shared";

export const quoteAcceptedDataSchema = z.strictObject({
  quoteId: uuidSchema,
  opportunityId: uuidSchema,
  revisionNumber: revisionNumberSchema,
  acceptanceId: uuidSchema,
  acceptedAt: offsetTimestampSchema,
  amountMinor: minorAmountSchema,
  currency: currencySchema,
});
export const quoteAcceptedV1Schema = createEventSchema(
  "quote.accepted", 1, "vendor_os", quoteAcceptedDataSchema
);
export type QuoteAcceptedV1 = z.infer<typeof quoteAcceptedV1Schema>;

