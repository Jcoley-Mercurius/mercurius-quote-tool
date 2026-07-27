import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  fetchCustomerDetail,
  fetchCustomerDirectoryPage,
} from "./repository";

function builder(result: {
  data?: unknown[];
  error?: Error | null;
}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    or: vi.fn(),
    not: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve({
        data: result.data ?? [],
        error: result.error ?? null,
      }).then(resolve),
  };
  for (const method of [
    "select", "eq", "is", "or", "not", "in", "order", "limit",
  ] as const) {
    query[method].mockReturnValue(query);
  }
  query.maybeSingle.mockResolvedValue({
    data: result.data?.[0] ?? null,
    error: result.error ?? null,
  });
  return query;
}

function client(...queries: ReturnType<typeof builder>[]) {
  return {
    from: vi.fn((() => queries.shift()) as never),
  } as unknown as SupabaseClient;
}

const customer = {
  id: "customer-1",
  marketplace_homeowner_id: null,
  display_name: "Jordan Lee",
  email: "jordan@example.com",
  phone: "239-555-0100",
  preferred_contact_method: "email",
  created_at: "2026-07-20T10:00:00Z",
  updated_at: "2026-07-24T10:00:00Z",
};

describe("fetchCustomerDirectoryPage", () => {
  it("scopes personal reads and enriches a page with bounded bulk aggregates", async () => {
    const customers = builder({ data: [customer] });
    const properties = builder({ data: [{
      id: "property-1",
      customer_id: "customer-1",
      marketplace_property_id: null,
      address_line1: "10 Palm Ave",
      address_line2: null,
      city: "Cape Coral",
      region: "FL",
      postal_code: "33904",
      tags: [],
      updated_at: "2026-07-23T10:00:00Z",
    }] });
    const opportunities = builder({ data: [{
      id: "opp-1",
      customer_id: "customer-1",
      property_id: "property-1",
      summary: "AC repair",
      service_type: "hvac",
      status: "opened",
      origin: "direct",
      assigned_user_id: null,
      created_at: "2026-07-22T10:00:00Z",
      updated_at: "2026-07-25T10:00:00Z",
    }] });
    const quotes = builder({ data: [{
      id: "quote-1",
      opportunity_id: "opp-1",
      reference: "MQ-1",
      job_name: "AC repair",
      status: "draft",
      created_at: "2026-07-25T10:00:00Z",
      updated_at: "2026-07-25T10:00:00Z",
      shared_at: null,
    }] });

    const result = await fetchCustomerDirectoryPage(
      "user-1",
      { type: "personal" },
      "",
      null,
      client(customers, properties, opportunities, quotes)
    );

    expect(customers.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(customers.is).toHaveBeenCalledWith("organization_id", null);
    expect(properties.in).toHaveBeenCalledWith("customer_id", ["customer-1"]);
    expect(opportunities.in).toHaveBeenCalledWith("customer_id", ["customer-1"]);
    expect(quotes.in).toHaveBeenCalledWith("opportunity_id", ["opp-1"]);
    expect(result.items[0]).toMatchObject({
      primaryProperty: "10 Palm Ave, Cape Coral, FL 33904",
      openOpportunityCount: 1,
      linkedQuoteCount: 1,
    });
  });

  it("applies stable organization cursor ordering and exposes partial aggregate failure", async () => {
    const customers = builder({ data: [customer] });
    const properties = builder({ error: new Error("unavailable") });
    const opportunities = builder({ data: [] });
    const result = await fetchCustomerDirectoryPage(
      "ignored-by-rls",
      { type: "organization", organizationId: "org-1", name: "Team" },
      "",
      { updatedAt: "2026-07-26T00:00:00Z", id: "cursor-id" },
      client(customers, properties, opportunities)
    );
    expect(customers.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(customers.or).toHaveBeenCalledWith(
      "updated_at.lt.2026-07-26T00:00:00Z,and(updated_at.eq.2026-07-26T00:00:00Z,id.lt.cursor-id)"
    );
    expect(customers.order).toHaveBeenNthCalledWith(
      1, "updated_at", { ascending: false }
    );
    expect(customers.order).toHaveBeenNthCalledWith(
      2, "id", { ascending: false }
    );
    expect(result.aggregatesComplete).toBe(false);
    expect(result.items[0].openOpportunityCount).toBeNull();
  });

  it("searches associated addresses before loading matching customers", async () => {
    const propertySearch = builder({
      data: [{ customer_id: "customer-1" }],
    });
    const directCustomers = builder({ data: [] });
    const relatedCustomers = builder({ data: [customer] });
    const properties = builder({ data: [] });
    const opportunities = builder({ data: [] });
    const result = await fetchCustomerDirectoryPage(
      "user-1",
      { type: "personal" },
      "Palm Ave",
      null,
      client(
        propertySearch,
        directCustomers,
        relatedCustomers,
        properties,
        opportunities
      )
    );
    expect(propertySearch.or).toHaveBeenCalledWith(
      expect.stringContaining("address_line1.ilike.%Palm Ave%")
    );
    expect(relatedCustomers.in).toHaveBeenCalledWith("id", ["customer-1"]);
    expect(result.items).toHaveLength(1);
  });
});

describe("fetchCustomerDetail", () => {
  it("returns safe not-found for a hidden customer", async () => {
    const customerQuery = builder({ data: [] });
    await expect(fetchCustomerDetail(
      "user-1",
      { type: "organization", organizationId: "org-1", name: "Team" },
      "customer-1",
      client(customerQuery)
    )).resolves.toBeNull();
    expect(customerQuery.eq).toHaveBeenCalledWith("id", "customer-1");
    expect(customerQuery.eq).toHaveBeenCalledWith("organization_id", "org-1");
  });

  it("keeps core detail and created events when timeline sources partially fail", async () => {
    const customerQuery = builder({ data: [customer] });
    const properties = builder({ data: [] });
    const opportunities = builder({ data: [{
      id: "opp-1",
      customer_id: "customer-1",
      property_id: null,
      summary: "AC repair",
      service_type: "hvac",
      status: "new",
      origin: "direct",
      assigned_user_id: null,
      created_at: "2026-07-22T10:00:00Z",
      updated_at: "2026-07-22T10:00:00Z",
    }] });
    const quotes = builder({ data: [] });
    const status = builder({ error: new Error("history unavailable") });
    const assignment = builder({ data: [] });
    const result = await fetchCustomerDetail(
      "user-1",
      { type: "personal" },
      "customer-1",
      client(customerQuery, properties, opportunities, quotes, status, assignment)
    );
    expect(result?.displayName).toBe("Jordan Lee");
    expect(result?.timeline).toMatchObject({
      status: "ready",
      complete: false,
      value: [expect.objectContaining({ title: "Opportunity created" })],
    });
  });

  it("does not duplicate an opportunity creation when authoritative initial history exists", async () => {
    const customerQuery = builder({ data: [customer] });
    const properties = builder({ data: [] });
    const opportunities = builder({ data: [{
      id: "opp-1",
      customer_id: "customer-1",
      property_id: null,
      summary: "AC repair",
      service_type: "hvac",
      status: "new",
      origin: "marketplace",
      assigned_user_id: null,
      created_at: "2026-07-22T10:00:00Z",
      updated_at: "2026-07-22T10:00:00Z",
    }] });
    const quotes = builder({ data: [] });
    const status = builder({ data: [{
      id: "status-1",
      opportunity_id: "opp-1",
      from_status: null,
      to_status: "new",
      actor_user_id: null,
      source_system: "marketplace",
      occurred_at: "2026-07-22T10:00:00Z",
    }] });
    const assignment = builder({ data: [] });
    const result = await fetchCustomerDetail(
      "user-1",
      { type: "personal" },
      "customer-1",
      client(customerQuery, properties, opportunities, quotes, status, assignment)
    );
    expect(result?.timeline.status).toBe("ready");
    if (result?.timeline.status === "ready") {
      expect(result.timeline.value.filter((item) =>
        item.title === "Opportunity created" || item.title === "Created as New"
      )).toHaveLength(1);
    }
  });
});
