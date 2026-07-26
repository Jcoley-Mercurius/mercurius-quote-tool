import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import { fetchOpportunityPage, OPPORTUNITY_LIST_SELECT } from "./repository";

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
  for (const method of ["select", "eq", "is", "not", "in", "order", "range"] as const) {
    builder[method].mockReturnValue(builder);
  }
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
