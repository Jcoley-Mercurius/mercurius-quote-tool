import { z } from "zod";
import {
  actorSchema,
  entityReferenceSchema,
  integrationMetadataSchema,
  offsetTimestampSchema,
  sourceSystemSchema,
  uuidSchema,
} from "./shared";

export const eventIdentifierSchema = z.object({
  eventType: z.string().trim().min(1).max(100),
  eventVersion: z.number().int().positive(),
});

export const eventEnvelopeSchema = z.strictObject({
  eventId: uuidSchema,
  eventType: z.string().trim().min(1).max(100),
  eventVersion: z.number().int().positive(),
  occurredAt: offsetTimestampSchema,
  sourceSystem: sourceSystemSchema,
  organizationId: uuidSchema,
  actor: actorSchema.optional(),
  entities: z.array(entityReferenceSchema).min(1).max(25),
  metadata: integrationMetadataSchema.default({}),
  data: z.unknown(),
});

export type EventEnvelope = z.infer<typeof eventEnvelopeSchema>;

export function createEventSchema<
  TType extends string,
  TVersion extends number,
  TSource extends "marketplace" | "vendor_os",
  TData extends z.ZodType,
>(
  eventType: TType,
  eventVersion: TVersion,
  sourceSystem: TSource,
  dataSchema: TData
) {
  return eventEnvelopeSchema.extend({
    eventType: z.literal(eventType),
    eventVersion: z.literal(eventVersion),
    sourceSystem: z.literal(sourceSystem),
    data: dataSchema,
  });
}

