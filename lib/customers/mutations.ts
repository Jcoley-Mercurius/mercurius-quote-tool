import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { CustomerRow, PreferredContactMethod } from "@/lib/supabase/types";

export type CustomerMutationErrorKind =
  | "conflict"
  | "forbidden"
  | "validation"
  | "unavailable";

export class CustomerMutationError extends Error {
  constructor(public readonly kind: CustomerMutationErrorKind, message: string) {
    super(message);
  }
}

function mutationError(error: { code?: string; message?: string }): CustomerMutationError {
  if (error.code === "40001") {
    return new CustomerMutationError(
      "conflict",
      "This customer changed while you were editing. Reload the latest record before trying again."
    );
  }
  if (error.code === "42501" || error.code === "P0002") {
    return new CustomerMutationError(
      "forbidden",
      "This customer is no longer available in the active workspace."
    );
  }
  if (error.code === "22023" || error.code === "23514") {
    return new CustomerMutationError("validation", error.message || "Check the customer details.");
  }
  return new CustomerMutationError("unavailable", "The customer could not be saved. Try again.");
}

async function invoke(
  name: "update_customer" | "archive_customer" | "restore_customer",
  args: Record<string, unknown>,
  client: SupabaseClient
): Promise<CustomerRow> {
  const result = await client.rpc(name, args);
  if (result.error) throw mutationError(result.error);
  const value = Array.isArray(result.data) ? result.data[0] : result.data;
  if (!value) throw new CustomerMutationError("unavailable", "The customer could not be saved.");
  return value as CustomerRow;
}

export interface UpdateCustomerInput {
  customerId: string;
  expectedUpdatedAt: string;
  displayName: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  preferredContactMethod: PreferredContactMethod | null;
  summary: string | null;
  tags: string[];
}

export function updateCustomer(
  input: UpdateCustomerInput,
  client: SupabaseClient = getSupabaseClient()
) {
  return invoke("update_customer", {
    p_customer_id: input.customerId,
    p_expected_updated_at: input.expectedUpdatedAt,
    p_display_name: input.displayName,
    p_company_name: input.companyName,
    p_email: input.email,
    p_phone: input.phone,
    p_preferred_contact_method: input.preferredContactMethod,
    p_summary: input.summary,
    p_tags: input.tags,
  }, client);
}

export function archiveCustomer(
  customerId: string,
  expectedUpdatedAt: string,
  reason: string | null,
  client: SupabaseClient = getSupabaseClient()
) {
  return invoke("archive_customer", {
    p_customer_id: customerId,
    p_expected_updated_at: expectedUpdatedAt,
    p_reason: reason,
  }, client);
}

export function restoreCustomer(
  customerId: string,
  expectedUpdatedAt: string,
  client: SupabaseClient = getSupabaseClient()
) {
  return invoke("restore_customer", {
    p_customer_id: customerId,
    p_expected_updated_at: expectedUpdatedAt,
  }, client);
}
