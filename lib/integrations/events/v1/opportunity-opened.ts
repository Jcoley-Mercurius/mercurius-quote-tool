import { z } from "zod";
import { createEventSchema } from "../envelope";
import { offsetTimestampSchema, uuidSchema } from "../shared";

export const opportunityOpenedDataSchema = z.strictObject({
  opportunityId: uuidSchema,
  openedAt: offsetTimestampSchema,
});
export const opportunityOpenedV1Schema = createEventSchema(
  "opportunity.opened", 1, "vendor_os", opportunityOpenedDataSchema
);
export type OpportunityOpenedV1 = z.infer<typeof opportunityOpenedV1Schema>;

