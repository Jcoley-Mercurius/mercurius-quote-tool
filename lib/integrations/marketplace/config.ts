import "server-only";

export const MARKETPLACE_MAX_BODY_BYTES = 256 * 1024;

export function isMarketplaceIngestionEnabled(
  environment: NodeJS.ProcessEnv = process.env
): boolean {
  const configured = environment.MERCURIUS_MARKETPLACE_INGESTION_ENABLED;
  if (configured !== undefined) {
    return configured.trim().toLowerCase() === "true";
  }
  return environment.NODE_ENV !== "production";
}

export function getMarketplaceWebhookSecret(): string | undefined {
  return process.env.MERCURIUS_MARKETPLACE_WEBHOOK_SECRET;
}
