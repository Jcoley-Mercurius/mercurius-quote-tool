import { z } from "zod";
import { createEventSchema } from "../envelope";
import { offsetTimestampSchema, uuidSchema } from "../shared";

export const jobCreatedDataSchema = z.strictObject({
  jobId: uuidSchema,
  opportunityId: uuidSchema,
  acceptedQuoteId: uuidSchema,
  createdAt: offsetTimestampSchema,
});
export const jobCreatedV1Schema = createEventSchema(
  "job.created", 1, "vendor_os", jobCreatedDataSchema
);
export type JobCreatedV1 = z.infer<typeof jobCreatedV1Schema>;

