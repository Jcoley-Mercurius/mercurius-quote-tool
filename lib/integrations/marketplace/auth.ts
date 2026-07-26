import "server-only";

import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";

export const MARKETPLACE_REPLAY_TOLERANCE_SECONDS = 300;

interface VerifyMarketplaceSignatureOptions {
  secret: string | undefined;
  nowSeconds: number;
}

export function createMarketplaceSignature(
  secret: string,
  timestamp: string,
  rawBody: Uint8Array
): string {
  const hmac = createHmac("sha256", secret);
  hmac.update(timestamp);
  hmac.update(".");
  hmac.update(rawBody);
  return hmac.digest("hex");
}

export function verifyMarketplaceSignature(
  headers: Headers,
  rawBody: Uint8Array,
  options: VerifyMarketplaceSignatureOptions
): boolean {
  const secret = options.secret?.trim();
  const timestamp = headers.get("x-mercurius-timestamp");
  const signature = headers.get("x-mercurius-signature");

  if (
    !secret ||
    !timestamp ||
    !signature ||
    !/^\d+$/.test(timestamp) ||
    !/^[a-f0-9]{64}$/.test(signature)
  ) {
    return false;
  }

  const timestampSeconds = Number(timestamp);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(options.nowSeconds - timestampSeconds) >
      MARKETPLACE_REPLAY_TOLERANCE_SECONDS
  ) {
    return false;
  }

  const expected = Buffer.from(
    createMarketplaceSignature(secret, timestamp, rawBody),
    "hex"
  );
  const received = Buffer.from(signature, "hex");
  return timingSafeEqual(expected, received);
}
