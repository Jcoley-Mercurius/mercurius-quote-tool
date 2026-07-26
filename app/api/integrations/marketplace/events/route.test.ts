import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/integrations/marketplace/server", () => ({
  processMarketplaceLeadAssigned: vi.fn(),
}));

import {
  marketplaceLeadAssignedV1Fixture,
  opportunityCreatedV1Fixture,
} from "@/lib/integrations/events/__fixtures__/v1";
import { createMarketplaceSignature } from "@/lib/integrations/marketplace/auth";
import { processMarketplaceLeadAssigned } from "@/lib/integrations/marketplace/server";
import { POST } from "./route";

const mockedProcess = vi.mocked(processMarketplaceLeadAssigned);
const secret = "route-test-secret";
const nowSeconds = 1721913600;

function signedRequest(
  value: unknown,
  options: {
    contentType?: string;
    timestamp?: number;
    signature?: string;
    rawBody?: string;
  } = {}
): Request {
  const rawBody = options.rawBody ?? JSON.stringify(value);
  const timestamp = String(options.timestamp ?? nowSeconds);
  const bytes = new TextEncoder().encode(rawBody);
  return new Request("http://localhost/api/integrations/marketplace/events", {
    method: "POST",
    headers: {
      "content-type": options.contentType ?? "application/json; charset=utf-8",
      "x-mercurius-timestamp": timestamp,
      "x-mercurius-signature":
        options.signature ??
        createMarketplaceSignature(secret, timestamp, bytes),
    },
    body: rawBody,
  });
}

async function responseBody(response: Response) {
  return (await response.json()) as Record<string, unknown>;
}

describe("POST Marketplace events", () => {
  beforeEach(() => {
    mockedProcess.mockReset();
    vi.stubEnv("MERCURIUS_MARKETPLACE_INGESTION_ENABLED", "true");
    vi.stubEnv("MERCURIUS_MARKETPLACE_WEBHOOK_SECRET", secret);
    vi.setSystemTime(nowSeconds * 1000);
    mockedProcess.mockResolvedValue({
      processingStatus: "processed",
      eventId: marketplaceLeadAssignedV1Fixture.eventId,
      organizationId: marketplaceLeadAssignedV1Fixture.organizationId,
      opportunityId: "00000000-0000-4000-8000-000000000009",
      errorCode: null,
    });
  });

  it("processes the strict shared fixture", async () => {
    const response = await POST(signedRequest(marketplaceLeadAssignedV1Fixture));
    expect(response.status).toBe(200);
    expect(await responseBody(response)).toMatchObject({
      ok: true,
      status: "processed",
      eventId: marketplaceLeadAssignedV1Fixture.eventId,
    });
    expect(mockedProcess).toHaveBeenCalledOnce();
  });

  it("rejects an invalid content type", async () => {
    const response = await POST(
      signedRequest(marketplaceLeadAssignedV1Fixture, { contentType: "text/plain" })
    );
    expect(response.status).toBe(415);
  });

  it("rejects an oversized raw body", async () => {
    const response = await POST(
      signedRequest(null, { rawBody: "x".repeat(256 * 1024 + 1) })
    );
    expect(response.status).toBe(413);
  });

  it.each([
    ["invalid JSON", "{", 400, "INVALID_EVENT"],
    ["invalid contract", JSON.stringify({ eventType: "marketplace.lead.assigned" }), 400, "INVALID_EVENT"],
  ])("rejects %s", async (_label, rawBody, status, code) => {
    const response = await POST(signedRequest(null, { rawBody }));
    expect(response.status).toBe(status);
    expect(await responseBody(response)).toEqual({ ok: false, code });
  });

  it.each([
    ["unsupported type", { ...marketplaceLeadAssignedV1Fixture, eventType: "unsupported.event" }],
    ["unsupported version", { ...marketplaceLeadAssignedV1Fixture, eventVersion: 2 }],
    ["other registered event", opportunityCreatedV1Fixture],
  ])("rejects %s", async (_label, event) => {
    const response = await POST(signedRequest(event));
    expect(response.status).toBe(422);
    expect(await responseBody(response)).toEqual({
      ok: false,
      code: "UNSUPPORTED_EVENT",
    });
  });

  it("rejects an invalid signature", async () => {
    const response = await POST(
      signedRequest(marketplaceLeadAssignedV1Fixture, {
        signature: "0".repeat(64),
      })
    );
    expect(response.status).toBe(401);
  });

  it("rejects an expired timestamp", async () => {
    const response = await POST(
      signedRequest(marketplaceLeadAssignedV1Fixture, {
        timestamp: nowSeconds - 301,
      })
    );
    expect(response.status).toBe(401);
  });

  it("fails closed when disabled", async () => {
    vi.stubEnv("MERCURIUS_MARKETPLACE_INGESTION_ENABLED", "false");
    const response = await POST(signedRequest(marketplaceLeadAssignedV1Fixture));
    expect(response.status).toBe(503);
    expect(mockedProcess).not.toHaveBeenCalled();
  });

  it.each([
    ["unknown_marketplace_vendor", 422, "UNKNOWN_MARKETPLACE_VENDOR"],
    ["event_processing", 409, "EVENT_PROCESSING"],
  ] as const)("maps %s to a stable response", async (processingStatus, status, code) => {
    mockedProcess.mockResolvedValue({
      processingStatus,
      eventId: marketplaceLeadAssignedV1Fixture.eventId,
      organizationId: null,
      opportunityId: null,
      errorCode:
        processingStatus === "unknown_marketplace_vendor"
          ? "unknown_marketplace_vendor"
          : null,
    });
    const response = await POST(signedRequest(marketplaceLeadAssignedV1Fixture));
    expect(response.status).toBe(status);
    expect(await responseBody(response)).toMatchObject({ ok: false, code });
  });

  it("returns the existing logical result for a processed duplicate", async () => {
    mockedProcess.mockResolvedValue({
      processingStatus: "already_processed",
      eventId: marketplaceLeadAssignedV1Fixture.eventId,
      organizationId: marketplaceLeadAssignedV1Fixture.organizationId,
      opportunityId: "00000000-0000-4000-8000-000000000009",
      errorCode: null,
    });
    const response = await POST(signedRequest(marketplaceLeadAssignedV1Fixture));
    expect(await responseBody(response)).toMatchObject({
      ok: true,
      status: "already_processed",
    });
  });

  it("redacts unexpected internal failures", async () => {
    mockedProcess.mockRejectedValue(
      new Error("homeowner@example.com at 123 Example Street")
    );
    const response = await POST(signedRequest(marketplaceLeadAssignedV1Fixture));
    const body = JSON.stringify(await responseBody(response));
    expect(response.status).toBe(500);
    expect(body).toBe('{"ok":false,"code":"INTERNAL_ERROR"}');
    expect(body).not.toContain("homeowner");
    expect(body).not.toContain("Street");
  });
});
