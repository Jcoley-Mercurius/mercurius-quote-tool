import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import {
  fetchOpportunityDetail,
  fetchOpportunityHistory,
  fetchOpportunityPage,
  fetchOpportunityQuotes,
  OPPORTUNITY_DETAIL_SELECT,
  OPPORTUNITY_HISTORY_SELECT,
  OPPORTUNITY_LIST_SELECT,
  OPPORTUNITY_QUOTES_SELECT,
} from "./repository";

function queryBuilder(result: {
  data?: unknown[];
  count?: number | null;
  error?: Error | null;
}) {
  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    not: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    range: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn(),
    then: (
      resolve: (value: {
        data: unknown[];
        count: number | null;
        error: Error | null;
      }) => unknown
    ) =>
      Promise.resolve({
        data: result.data ?? [],
        count: result.count ?? 0,
        error: result.error ?? null,
      }).then(resolve),
  };
  for (const method of ["select", "eq", "is", "not", "in", "order", "range", "limit"] as const) {
    builder[method].mockReturnValue(builder);
  }
  builder.maybeSingle.mockResolvedValue({
    data: result.data?.[0] ?? null,
    error: result.error ?? null,
  });
  return builder;
}

function clientWith(
  filteredCount: ReturnType<typeof queryBuilder>,
  total: ReturnType<typeof queryBuilder>,
  list: ReturnType<typeof queryBuilder>,
) {
  const client = {
    from: vi.fn()
      .mockReturnValueOnce(filteredCount)
      .mockReturnValueOnce(total)
      .mockReturnValueOnce(list)
  };
  return client as unknown as SupabaseClient;
}

describe("fetchOpportunityPage", () => {
  it("applies organization scope, filters, exact count, ordering, and bounded range", async () => {
    const filteredCount = queryBuilder({ count: 47 });
    const total = queryBuilder({ count: 60 });
    const list = queryBuilder({});
    await fetchOpportunityPage(
      "user-1",
      { type: "organization", organizationId: "org-1", name: "Team" },
      { status: "active", origin: "marketplace", assignment: "unassigned" },
      2,
      clientWith(filteredCount, total, list)
    );

    expect(filteredCount.select).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(list.select).toHaveBeenCalledWith(OPPORTUNITY_LIST_SELECT);
    expect(OPPORTUNITY_LIST_SELECT).not.toMatch(
      /description|source_snapshot|payload|notes|property_data/
    );
    expect(filteredCount.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(filteredCount.in).toHaveBeenCalledWith("status", [
      "new", "opened", "quoting", "quoted",
    ]);
    expect(filteredCount.eq).toHaveBeenCalledWith("origin", "marketplace");
    expect(filteredCount.is).toHaveBeenCalledWith("assigned_user_id", null);
    expect(list.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(list.in).toHaveBeenCalledWith("status", [
      "new", "opened", "quoting", "quoted",
    ]);
    expect(list.eq).toHaveBeenCalledWith("origin", "marketplace");
    expect(list.is).toHaveBeenCalledWith("assigned_user_id", null);
    expect(list.order).toHaveBeenCalledWith("updated_at", { ascending: false });
    expect(list.range).toHaveBeenCalledWith(20, 39);
    expect(total.select).toHaveBeenCalledWith("id", {
      count: "exact",
      head: true,
    });
    expect(total.eq).toHaveBeenCalledWith("organization_id", "org-1");
  });

  it("applies personal user and null-organization scope plus assigned filtering", async () => {
    const filteredCount = queryBuilder({ count: 1 });
    const total = queryBuilder({ count: 1 });
    const list = queryBuilder({});
    await fetchOpportunityPage(
      "user-1",
      { type: "personal" },
      { status: "all", origin: "all", assignment: "assigned" },
      1,
      clientWith(filteredCount, total, list)
    );
    expect(filteredCount.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(filteredCount.is).toHaveBeenCalledWith("organization_id", null);
    expect(filteredCount.not).toHaveBeenCalledWith("assigned_user_id", "is", null);
    expect(list.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(list.is).toHaveBeenCalledWith("organization_id", null);
    expect(list.not).toHaveBeenCalledWith("assigned_user_id", "is", null);
    expect(total.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(total.is).toHaveBeenCalledWith("organization_id", null);
  });

  it("resolves Mine with the authenticated user ID inside the repository", async () => {
    const filteredCount = queryBuilder({ count: 2 });
    const total = queryBuilder({ count: 5 });
    const list = queryBuilder({});
    await fetchOpportunityPage(
      "authenticated-user",
      { type: "organization", organizationId: "org-1", name: "Team" },
      { status: "all", origin: "all", assignment: "mine" },
      1,
      clientWith(filteredCount, total, list)
    );

    expect(filteredCount.eq).toHaveBeenCalledWith(
      "assigned_user_id",
      "authenticated-user"
    );
    expect(list.eq).toHaveBeenCalledWith(
      "assigned_user_id",
      "authenticated-user"
    );
  });

  it("keeps repository errors distinct from successful zero results", async () => {
    const failure = new Error("query failed");
    await expect(
      fetchOpportunityPage(
        "user-1",
        { type: "personal" },
        { status: "active", origin: "all", assignment: "all" },
        1,
        clientWith(
          queryBuilder({ error: failure }),
          queryBuilder({ count: 0 }),
          queryBuilder({})
        )
      )
    ).rejects.toBe(failure);

    await expect(
      fetchOpportunityPage(
        "user-1",
        { type: "personal" },
        { status: "active", origin: "all", assignment: "all" },
        1,
        clientWith(
          queryBuilder({ count: 0 }),
          queryBuilder({ count: 0 }),
          queryBuilder({})
        )
      )
    ).resolves.toMatchObject({ items: [], totalCount: 0, workspaceTotalCount: 0 });
  });

  it("clamps an oversized page before applying the database range", async () => {
    const filteredCount = queryBuilder({ count: 21 });
    const total = queryBuilder({ count: 21 });
    const list = queryBuilder({});
    const result = await fetchOpportunityPage(
      "user-1",
      { type: "personal" },
      { status: "all", origin: "all", assignment: "all" },
      Number.MAX_SAFE_INTEGER,
      clientWith(filteredCount, total, list)
    );

    expect(result.page).toBe(2);
    expect(list.range).toHaveBeenCalledWith(20, 39);
  });
});

describe("opportunity detail repositories", () => {
  it("scopes organization detail by both ID and active organization", async () => {
    const query = queryBuilder({ data: [] });
    const client = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
    await expect(fetchOpportunityDetail(
      "user-1",
      { type: "organization", organizationId: "org-1", name: "Team" },
      "opp-1",
      client
    )).resolves.toBeNull();
    expect(query.select).toHaveBeenCalledWith(OPPORTUNITY_DETAIL_SELECT);
    expect(query.eq).toHaveBeenCalledWith("id", "opp-1");
    expect(query.eq).toHaveBeenCalledWith("organization_id", "org-1");
    expect(OPPORTUNITY_DETAIL_SELECT).not.toMatch(
      /payload|notes|property_data|marketplace_lead_id|marketplace_request_id/
    );
  });

  it("scopes personal detail by ID, user, and null organization", async () => {
    const query = queryBuilder({ data: [] });
    const client = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
    await fetchOpportunityDetail(
      "user-1",
      { type: "personal" },
      "opp-1",
      client
    );
    expect(query.eq).toHaveBeenCalledWith("id", "opp-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.is).toHaveBeenCalledWith("organization_id", null);
  });

  it("maps missing customer and property joins safely", async () => {
    const query = queryBuilder({ data: [{
      id: "opp-1",
      origin: "direct",
      status: "new",
      service_type: "HVAC",
      summary: "",
      description: "",
      assigned_user_id: null,
      source_snapshot: { raw: "ignored" },
      opened_at: null,
      declined_at: null,
      closed_at: null,
      created_at: "2026-07-20T12:00:00Z",
      updated_at: "2026-07-20T12:00:00Z",
      customer: null,
      property: null,
    }] });
    const client = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
    await expect(fetchOpportunityDetail(
      "user-1",
      { type: "personal" },
      "opp-1",
      client
    )).resolves.toMatchObject({
      title: "HVAC",
      customer: null,
      property: null,
      marketplaceContext: null,
    });
  });

  it("scopes and bounds history without selecting integration event IDs", async () => {
    const query = queryBuilder({ data: [] });
    const client = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
    await fetchOpportunityHistory(
      "user-1",
      { type: "organization", organizationId: "org-1", name: "Team" },
      "opp-1",
      500,
      client
    );
    expect(query.select).toHaveBeenCalledWith(OPPORTUNITY_HISTORY_SELECT);
    expect(query.eq).toHaveBeenCalledWith("opportunity_id", "opp-1");
    expect(query.eq).toHaveBeenCalledWith("opportunity.organization_id", "org-1");
    expect(query.limit).toHaveBeenCalledWith(50);
    expect(OPPORTUNITY_HISTORY_SELECT).not.toMatch(/integration_event_id|details/);
  });

  it("scopes and bounds linked quotes", async () => {
    const query = queryBuilder({ data: [] });
    const client = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
    await fetchOpportunityQuotes(
      "user-1",
      { type: "personal" },
      "opp-1",
      500,
      client
    );
    expect(query.select).toHaveBeenCalledWith(OPPORTUNITY_QUOTES_SELECT);
    expect(query.eq).toHaveBeenCalledWith("opportunity_id", "opp-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(query.is).toHaveBeenCalledWith("organization_id", null);
    expect(query.limit).toHaveBeenCalledWith(20);
  });

  it("keeps secondary repository errors distinct", async () => {
    const failure = new Error("secondary failed");
    const query = queryBuilder({ error: failure });
    const client = { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
    await expect(fetchOpportunityHistory(
      "user-1",
      { type: "personal" },
      "opp-1",
      25,
      client
    )).rejects.toBe(failure);
  });
});
