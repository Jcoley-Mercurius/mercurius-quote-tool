import { IntegrationEventRegistryError, safeParseIntegrationEvent } from "@/lib/integrations/events";
import { verifyMarketplaceSignature } from "@/lib/integrations/marketplace/auth";
import {
  MarketplaceBodyTooLargeError,
  readRequestBody,
} from "@/lib/integrations/marketplace/body";
import {
  getMarketplaceWebhookSecret,
  isMarketplaceIngestionEnabled,
  MARKETPLACE_MAX_BODY_BYTES,
} from "@/lib/integrations/marketplace/config";
import { processMarketplaceLeadAssigned } from "@/lib/integrations/marketplace/server";

export const runtime = "nodejs";

function json(body: object, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

export async function POST(request: Request): Promise<Response> {
  if (!isMarketplaceIngestionEnabled()) {
    return json({ ok: false, code: "INGESTION_DISABLED" }, 503);
  }

  const contentType = request.headers.get("content-type");
  if (contentType?.split(";", 1)[0].trim().toLowerCase() !== "application/json") {
    return json({ ok: false, code: "UNSUPPORTED_MEDIA_TYPE" }, 415);
  }

  let rawBody: Uint8Array;
  try {
    rawBody = await readRequestBody(request, MARKETPLACE_MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof MarketplaceBodyTooLargeError) {
      return json({ ok: false, code: "PAYLOAD_TOO_LARGE" }, 413);
    }
    return json({ ok: false, code: "INTERNAL_ERROR" }, 500);
  }

  if (
    !verifyMarketplaceSignature(request.headers, rawBody, {
      secret: getMarketplaceWebhookSecret(),
      nowSeconds: Math.floor(Date.now() / 1000),
    })
  ) {
    return json({ ok: false, code: "INVALID_SIGNATURE" }, 401);
  }

  let input: unknown;
  try {
    input = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return json({ ok: false, code: "INVALID_EVENT" }, 400);
  }

  const parsed = safeParseIntegrationEvent(input);
  if (!parsed.success) {
    if (parsed.error instanceof IntegrationEventRegistryError) {
      return json({ ok: false, code: "UNSUPPORTED_EVENT" }, 422);
    }
    return json({ ok: false, code: "INVALID_EVENT" }, 400);
  }

  if (
    parsed.data.eventType !== "marketplace.lead.assigned" ||
    parsed.data.eventVersion !== 1 ||
    parsed.data.sourceSystem !== "marketplace"
  ) {
    return json({ ok: false, code: "UNSUPPORTED_EVENT" }, 422);
  }

  try {
    const result = await processMarketplaceLeadAssigned(
      parsed.data,
      new Date().toISOString()
    );

    if (
      result.processingStatus === "processed" ||
      result.processingStatus === "already_processed"
    ) {
      return json(
        {
          ok: true,
          status: result.processingStatus,
          eventId: result.eventId,
          opportunityId: result.opportunityId,
        },
        200
      );
    }

    if (result.processingStatus === "event_processing") {
      return json(
        { ok: false, code: "EVENT_PROCESSING", eventId: result.eventId },
        409
      );
    }

    if (result.processingStatus === "unknown_marketplace_vendor") {
      return json({ ok: false, code: "UNKNOWN_MARKETPLACE_VENDOR" }, 422);
    }

    if (
      result.errorCode === "immutable_identity_conflict" ||
      result.errorCode === "invalid_workspace_relationship" ||
      result.errorCode === "projection_conflict"
    ) {
      return json({ ok: false, code: "PROJECTION_CONFLICT" }, 409);
    }

    return json({ ok: false, code: "INTERNAL_ERROR" }, 500);
  } catch {
    return json({ ok: false, code: "INTERNAL_ERROR" }, 500);
  }
}
