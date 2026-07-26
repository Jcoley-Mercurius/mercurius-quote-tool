import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const offsetTimestampSchema = z.string().datetime({ offset: true });
export const boundedTextSchema = z.string().trim().min(1).max(500);
export const currencySchema = z.literal("USD");
export const minorAmountSchema = z.number().int().nonnegative();
export const revisionNumberSchema = z.number().int().positive();

export const sourceSystemSchema = z.enum(["marketplace", "vendor_os"]);
export type SourceSystem = z.infer<typeof sourceSystemSchema>;

export const actorSchema = z.discriminatedUnion("actorType", [
  z.strictObject({
    actorType: z.literal("vendor_os_user"),
    userId: uuidSchema,
  }),
  z.strictObject({
    actorType: z.literal("marketplace_homeowner"),
    marketplaceHomeownerId: uuidSchema,
  }),
  z.strictObject({
    actorType: z.literal("system"),
    system: sourceSystemSchema,
  }),
]);
export type IntegrationActor = z.infer<typeof actorSchema>;

export const entityTypeSchema = z.enum([
  "marketplaceRequest",
  "marketplaceLead",
  "marketplaceVendor",
  "organization",
  "customer",
  "property",
  "opportunity",
  "quote",
  "acceptance",
  "changeRequest",
  "job",
]);

export const entityReferenceSchema = z.strictObject({
  entityType: entityTypeSchema,
  entityId: uuidSchema,
});
export type EntityReference = z.infer<typeof entityReferenceSchema>;

// Deliberately finite: adding a metadata key is a reviewed contract change.
export const integrationMetadataSchema = z.strictObject({
  correlationId: uuidSchema.optional(),
  causationId: uuidSchema.optional(),
  traceId: z.string().trim().min(1).max(128).optional(),
  environment: z.enum(["development", "test", "staging", "production"]).optional(),
  schemaRevision: z.number().int().positive().optional(),
});
export type IntegrationMetadata = z.infer<typeof integrationMetadataSchema>;

export const opportunityOriginSchema = z.enum([
  "marketplace",
  "direct",
  "repair_request",
]);
export const opportunityStatusSchema = z.enum([
  "new",
  "opened",
  "quoting",
  "quoted",
  "won",
  "lost",
  "declined",
  "closed",
]);
export const declineReasonSchema = z.enum([
  "outside_service_area",
  "service_not_offered",
  "unavailable",
  "insufficient_information",
  "duplicate",
  "other",
]);

export const generatedQuoteSourceSchema = z.enum(["ai", "fallback"]);
export const jobCompletionCodeSchema = z.enum([
  "completed",
  "completed_with_follow_up",
  "cancelled",
]);

