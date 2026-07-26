import { z } from "zod";
import { createEventSchema } from "../envelope";
import {
  declineReasonSchema,
  offsetTimestampSchema,
  uuidSchema,
} from "../shared";

export const opportunityDeclinedDataSchema = z.strictObject({
  opportunityId: uuidSchema,
  reasonCode: declineReasonSchema,
  reason: z.string().trim().min(1).max(500).optional(),
  declinedAt: offsetTimestampSchema,
});
export const opportunityDeclinedV1Schema = createEventSchema(
  "opportunity.declined", 1, "vendor_os", opportunityDeclinedDataSchema
);
export type OpportunityDeclinedV1 = z.infer<typeof opportunityDeclinedV1Schema>;

