import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { PropertyRow } from "@/lib/supabase/types";

export class PropertyMutationError extends Error {
  constructor(public readonly kind: "conflict" | "forbidden" | "validation" | "unavailable", message: string) {
    super(message);
  }
}

export interface UpdatePropertyInput {
  propertyId: string;
  expectedUpdatedAt: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string;
  summary: string | null;
  accessInstructions: string | null;
  tags: string[];
  attributes: Record<string, string | number>;
}

export async function updateProperty(
  input: UpdatePropertyInput,
  client: SupabaseClient = getSupabaseClient()
): Promise<PropertyRow> {
  const result = await client.rpc("update_property", {
    p_property_id: input.propertyId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_address_line1: input.addressLine1,
    p_address_line2: input.addressLine2,
    p_city: input.city,
    p_region: input.region,
    p_postal_code: input.postalCode,
    p_country_code: input.countryCode,
    p_summary: input.summary,
    p_access_instructions: input.accessInstructions,
    p_tags: input.tags,
    p_attributes: input.attributes,
  });
  if (result.error) {
    if (result.error.code === "40001") throw new PropertyMutationError("conflict", "This property changed elsewhere. Reload the latest record before saving.");
    if (result.error.code === "42501" || result.error.code === "P0002") throw new PropertyMutationError("forbidden", "This property is no longer available in the active workspace.");
    if (result.error.code === "22023" || result.error.code === "23514") throw new PropertyMutationError("validation", result.error.message || "Check the property information.");
    throw new PropertyMutationError("unavailable", "The property could not be saved. Try again.");
  }
  const value = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!value) throw new PropertyMutationError("unavailable", "The property could not be saved.");
  return value as PropertyRow;
}
