import { describe, expect, it, vi } from "vitest";
import { updateProperty } from "./mutations";

function client(result: { data: unknown; error: null | { code: string; message: string } }) {
  return { rpc: vi.fn().mockResolvedValue(result) };
}

const input = {
  propertyId: "property-1",
  expectedUpdatedAt: "2026-01-01T00:00:00Z",
  addressLine1: "1 Main St",
  addressLine2: null,
  city: "Fort Myers",
  region: "FL",
  postalCode: "33901",
  countryCode: "US",
  summary: "Operational summary",
  accessInstructions: "Private",
  tags: ["residential"],
  attributes: { propertyType: "Single family" },
};

describe("property mutation boundary", () => {
  it("passes only approved mutable fields and the expected version", async () => {
    const scoped = client({ data: { id: "property-1" }, error: null });
    await updateProperty(input, scoped as never);
    expect(scoped.rpc).toHaveBeenCalledWith("update_property", expect.objectContaining({
      p_property_id: "property-1",
      p_expected_updated_at: "2026-01-01T00:00:00Z",
      p_access_instructions: "Private",
    }));
    expect(scoped.rpc.mock.calls[0][1]).not.toHaveProperty("organization_id");
    expect(scoped.rpc.mock.calls[0][1]).not.toHaveProperty("marketplace_property_id");
    expect(scoped.rpc.mock.calls[0][1]).not.toHaveProperty("customer_id");
  });

  it("maps stale and hidden records to safe application errors", async () => {
    await expect(updateProperty(input, client({
      data: null, error: { code: "40001", message: "raw stale database error" },
    }) as never)).rejects.toMatchObject({ kind: "conflict" });
    await expect(updateProperty(input, client({
      data: null, error: { code: "P0002", message: "revealing property detail" },
    }) as never)).rejects.toMatchObject({
      kind: "forbidden",
      message: "This property is no longer available in the active workspace.",
    });
  });

  it("does not log sensitive mutation data", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(updateProperty(input, client({
      data: null, error: { code: "50000", message: "database detail" },
    }) as never)).rejects.toMatchObject({ kind: "unavailable" });
    expect(log).not.toHaveBeenCalled();
    log.mockRestore();
  });
});
