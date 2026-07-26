import { z } from "zod";
import { createEventSchema } from "../envelope";
import {
  boundedTextSchema,
  currencySchema,
  minorAmountSchema,
  offsetTimestampSchema,
  uuidSchema,
} from "../shared";

const customerContactSchema = z.strictObject({
  displayName: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320),
  phone: z.string().trim().min(3).max(40).optional(),
});

const propertyAddressSchema = z.strictObject({
  addressLine1: z.string().trim().min(1).max(200),
  addressLine2: z.string().trim().min(1).max(200).optional(),
  city: z.string().trim().min(1).max(100),
  region: z.string().trim().min(1).max(100),
  postalCode: z.string().trim().min(1).max(20),
  countryCode: z.string().length(2),
});

const budgetRangeSchema = z
  .strictObject({
    minimumAmountMinor: minorAmountSchema,
    maximumAmountMinor: minorAmountSchema,
    currency: currencySchema,
  })
  .refine(
    ({ minimumAmountMinor, maximumAmountMinor }) =>
      maximumAmountMinor >= minimumAmountMinor,
    { message: "maximumAmountMinor must be greater than or equal to minimumAmountMinor" }
  );

export const marketplaceLeadAssignedDataSchema = z.strictObject({
  marketplaceLeadId: uuidSchema,
  marketplaceRequestId: uuidSchema,
  marketplaceVendorId: uuidSchema,
  marketplaceHomeownerId: uuidSchema.optional(),
  marketplacePropertyId: uuidSchema.optional(),
  assignedAt: offsetTimestampSchema,
  serviceCategory: z.strictObject({
    code: z.string().trim().min(1).max(100),
    displayName: z.string().trim().min(1).max(150),
  }),
  requestTitle: z.string().trim().min(1).max(200),
  requestDescription: boundedTextSchema,
  customer: customerContactSchema,
  property: propertyAddressSchema,
  preferredTiming: z.string().trim().min(1).max(200).optional(),
  budgetRange: budgetRangeSchema.optional(),
});

export const marketplaceLeadAssignedV1Schema = createEventSchema(
  "marketplace.lead.assigned",
  1,
  "marketplace",
  marketplaceLeadAssignedDataSchema
);
export type MarketplaceLeadAssignedV1 = z.infer<
  typeof marketplaceLeadAssignedV1Schema
>;

