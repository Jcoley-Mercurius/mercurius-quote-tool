import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { fetchPropertyDetail } from "./repository";

function builder(data: unknown[] = [], error: Error | null = null) {
  const query = {
    select: vi.fn(), eq: vi.fn(), is: vi.fn(), in: vi.fn(), order: vi.fn(),
    limit: vi.fn(), maybeSingle: vi.fn(),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data, error }).then(resolve),
  };
  for (const method of ["select", "eq", "is", "in", "order", "limit"] as const) {
    query[method].mockReturnValue(query);
  }
  query.maybeSingle.mockResolvedValue({ data: data[0] ?? null, error });
  return query;
}

function client(...queries: ReturnType<typeof builder>[]) {
  return { from: vi.fn((() => queries.shift()) as never) } as unknown as SupabaseClient;
}

const property = {
  id: "property-1", customer_id: "customer-1", marketplace_property_id: "marketplace-1",
  address_line1: "1 Main St", address_line2: null, city: "Fort Myers", region: "FL",
  postal_code: "33901", country_code: "US",
  property_data: { propertyType: "Single family", hiddenPayload: "never render" },
  notes: "Summary", access_instructions: "private gate code", tags: ["home"],
  created_at: "2025-01-01T00:00:00Z", updated_at: "2026-01-03T00:00:00Z",
};
const opportunity = {
  id: "opp-1", customer_id: "customer-1", property_id: "property-1",
  summary: "Repair", service_type: "hvac", status: "opened", origin: "direct",
  assigned_user_id: null, created_at: "2025-02-01T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};
const quote = {
  id: "quote-1", opportunity_id: "opp-1", reference: "MQ-1", job_name: "Repair",
  status: "accepted", created_at: "2025-03-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z", shared_at: "2025-03-02T00:00:00Z",
};

describe("fetchPropertyDetail", () => {
  it("scopes core/relationship reads and returns only allowlisted attributes", async () => {
    const core = builder([property]);
    const customer = builder([{ id: "customer-1", display_name: "Jordan", company_name: null, archived_at: null }]);
    const opportunities = builder([opportunity]);
    const audit = builder([]);
    const crmNotes = builder([]);
    const crmTasks = builder([]);
    const quotes = builder([quote]);
    const status = builder([]);
    const assignments = builder([]);
    const acceptances = builder([{ id: "accept-1", quote_id: "quote-1", accepted_at: "2025-03-03T00:00:00Z" }]);
    const changes = builder([]);
    const result = await fetchPropertyDetail(
      "user-1", { type: "personal" }, "property-1",
      client(core, customer, opportunities, audit, crmNotes, crmTasks, quotes, status, assignments, acceptances, changes)
    );
    expect(core.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(core.is).toHaveBeenCalledWith("organization_id", null);
    expect(opportunities.eq).toHaveBeenCalledWith("property_id", "property-1");
    expect(quotes.in).toHaveBeenCalledWith("opportunity_id", ["opp-1"]);
    expect(result).toMatchObject({
      source: "marketplace",
      attributes: { "Property type": "Single family" },
      recordedSince: "2025-01-01T00:00:00Z",
      indicators: { activeOpportunities: 1, linkedQuotes: 1, acceptedLinkedQuotes: 1 },
    });
    expect(result?.attributes).not.toHaveProperty("hiddenPayload");
    expect(JSON.stringify(result?.timeline)).not.toContain("private gate code");
  });

  it("returns null for hidden records without relationship fan-out", async () => {
    const core = builder([]);
    const scoped = client(core);
    await expect(fetchPropertyDetail(
      "user-1", { type: "organization", organizationId: "org-1", name: "Org" },
      "property-1", scoped
    )).resolves.toBeNull();
    expect(scoped.from).toHaveBeenCalledTimes(1);
  });
});
