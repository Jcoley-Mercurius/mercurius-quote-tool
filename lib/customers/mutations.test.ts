import { describe, expect, it, vi } from "vitest";
import { archiveCustomer, restoreCustomer, updateCustomer } from "./mutations";

function client(result: { data: unknown; error: null | { code: string; message: string } }) {
  return { rpc: vi.fn().mockResolvedValue(result) };
}

const row = {
  id: "customer-1",
  display_name: "Customer",
  updated_at: "2026-01-02T00:00:00Z",
};

describe("customer mutation boundary", () => {
  it("passes only the approved update projection and expected version", async () => {
    const scoped = client({ data: row, error: null });
    await updateCustomer({
      customerId: "customer-1",
      expectedUpdatedAt: "2026-01-01T00:00:00Z",
      displayName: "Updated",
      companyName: "Acme",
      email: "owner@example.test",
      phone: "+1 555 555 0100",
      preferredContactMethod: "email",
      summary: "Summary",
      tags: ["returning"],
    }, scoped as never);
    expect(scoped.rpc).toHaveBeenCalledWith("update_customer", expect.objectContaining({
      p_customer_id: "customer-1",
      p_expected_updated_at: "2026-01-01T00:00:00Z",
      p_display_name: "Updated",
    }));
    expect(scoped.rpc.mock.calls[0][1]).not.toHaveProperty("organization_id");
    expect(scoped.rpc.mock.calls[0][1]).not.toHaveProperty("marketplace_homeowner_id");
  });

  it("maps stale and authorization failures to safe errors", async () => {
    await expect(updateCustomer({
      customerId: "customer-1", expectedUpdatedAt: "old", displayName: "Name",
      companyName: null, email: null, phone: null, preferredContactMethod: null,
      summary: null, tags: [],
    }, client({ data: null, error: { code: "40001", message: "raw" } }) as never))
      .rejects.toMatchObject({ kind: "conflict" });
    await expect(restoreCustomer("customer-1", "old", client({
      data: null, error: { code: "P0002", message: "revealing raw detail" },
    }) as never)).rejects.toEqual(expect.objectContaining({
      kind: "forbidden",
      message: "This customer is no longer available in the active workspace.",
    }));
  });

  it("uses dedicated archive and restore operations", async () => {
    const scoped = client({ data: row, error: null });
    await archiveCustomer("customer-1", "version", "Duplicate entry", scoped as never);
    await restoreCustomer("customer-1", "next-version", scoped as never);
    expect(scoped.rpc).toHaveBeenNthCalledWith(1, "archive_customer", {
      p_customer_id: "customer-1", p_expected_updated_at: "version", p_reason: "Duplicate entry",
    });
    expect(scoped.rpc).toHaveBeenNthCalledWith(2, "restore_customer", {
      p_customer_id: "customer-1", p_expected_updated_at: "next-version",
    });
  });
});
