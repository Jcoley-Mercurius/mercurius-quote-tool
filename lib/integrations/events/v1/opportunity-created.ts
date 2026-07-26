import { z } from "zod";
import { createEventSchema } from "../envelope";
import {
  opportunityOriginSchema,
  opportunityStatusSchema,
  offsetTimestampSchema,
  uuidSchema,
} from "../shared";

export const opportunityCreatedDataSchema = z.strictObject({
  opportunityId: uuidSchema,
  origin: opportunityOriginSchema,
  marketplaceLeadId: uuidSchema.optional(),
  marketplaceRequestId: uuidSchema.optional(),
  status: opportunityStatusSchema.extract(["new"]),
  createdAt: offsetTimestampSchema,
});
export const opportunityCreatedV1Schema = createEventSchema(
  "opportunity.created", 1, "vendor_os", opportunityCreatedDataSchema
);
export type OpportunityCreatedV1 = z.infer<typeof opportunityCreatedV1Schema>;

