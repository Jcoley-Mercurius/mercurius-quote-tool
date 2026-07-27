import { beforeEach, describe, expect, it, vi } from "vitest";
import { removeOrganizationMember } from "./members";

const { getSupabaseClient, rpc } = vi.hoisted(() => ({
  getSupabaseClient: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({ getSupabaseClient }));

beforeEach(() => {
  vi.clearAllMocks();
  getSupabaseClient.mockReturnValue({ rpc });
  rpc.mockResolvedValue({ error: null });
});

describe("removeOrganizationMember", () => {
  it("uses the single atomic member-removal RPC with only the member ID", async () => {
    await removeOrganizationMember("membership-1");

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith("remove_organization_member", {
      p_member_id: "membership-1",
    });
  });

  it("preserves RPC failures for the existing safe UI error boundary", async () => {
    const failure = new Error("removal failed");
    rpc.mockResolvedValueOnce({ error: failure });

    await expect(removeOrganizationMember("membership-1")).rejects.toBe(
      failure
    );
  });
});
