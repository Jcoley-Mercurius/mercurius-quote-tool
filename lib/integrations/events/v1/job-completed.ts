import { z } from "zod";
import { createEventSchema } from "../envelope";
import {
  jobCompletionCodeSchema,
  offsetTimestampSchema,
  uuidSchema,
} from "../shared";

export const jobCompletedDataSchema = z.strictObject({
  jobId: uuidSchema,
  opportunityId: uuidSchema,
  completedAt: offsetTimestampSchema,
  completionCode: jobCompletionCodeSchema.optional(),
});
export const jobCompletedV1Schema = createEventSchema(
  "job.completed", 1, "vendor_os", jobCompletedDataSchema
);
export type JobCompletedV1 = z.infer<typeof jobCompletedV1Schema>;

