import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/migrate-local", () => ({
  migrateLocalDataToSupabase: vi.fn().mockResolvedValue(undefined),
  fetchQuotesForWorkspace: vi.fn(),
  upsertQuoteRow: vi.fn(),
  deleteQuoteRow: vi.fn(),
}));

vi.mock("@/lib/supabase/quotes-realtime", () => ({
  subscribeToQuotesRealtime: vi.fn(),
  stopQuotesRealtimeSubscription: vi.fn(),
}));

import { fetchQuotesForWorkspace } from "@/lib/supabase/migrate-local";
import {
  clearQuoteStore,
  getQuoteHydrateErrorSnapshot,
  hydrateQuoteStore,
} from "./store";

describe("hydrateQuoteStore", () => {
  beforeEach(() => {
    clearQuoteStore();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearQuoteStore();
  });

  it("surfaces a friendly error when quote loading fails", async () => {
    vi.mocked(fetchQuotesForWorkspace).mockRejectedValueOnce(
      new Error("Network error")
    );

    await hydrateQuoteStore("user-123");

    expect(getQuoteHydrateErrorSnapshot()).toMatch(/network error/i);
  });

  it("clears hydrate error after a successful retry", async () => {
    vi.mocked(fetchQuotesForWorkspace)
      .mockRejectedValueOnce(new Error("fetch failed"))
      .mockResolvedValueOnce([]);

    await hydrateQuoteStore("user-123");
    expect(getQuoteHydrateErrorSnapshot()).toBeTruthy();

    await hydrateQuoteStore("user-123", { type: "personal" }, { force: true });
    expect(getQuoteHydrateErrorSnapshot()).toBeNull();
  });
});