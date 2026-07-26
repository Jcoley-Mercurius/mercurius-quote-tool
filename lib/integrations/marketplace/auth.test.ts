import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  createMarketplaceSignature,
  verifyMarketplaceSignature,
} from "./auth";

const secret = "deterministic-test-secret";
const timestamp = "1721913600";
const nowSeconds = 1721913600;
const body = new TextEncoder().encode('{"eventId":"example"}');

function headers(
  signature = createMarketplaceSignature(secret, timestamp, body),
  timestampValue = timestamp
): Headers {
  return new Headers({
    "x-mercurius-timestamp": timestampValue,
    "x-mercurius-signature": signature,
  });
}

describe("Marketplace webhook authentication", () => {
  it("accepts a valid signature", () => {
    expect(
      verifyMarketplaceSignature(headers(), body, { secret, nowSeconds })
    ).toBe(true);
  });

  it.each([
    ["incorrect signature", "0".repeat(64), timestamp, secret],
    ["missing signature", null, timestamp, secret],
    ["missing timestamp", createMarketplaceSignature(secret, timestamp, body), null, secret],
    ["malformed timestamp", "0".repeat(64), "not-a-time", secret],
    ["old timestamp", "0".repeat(64), String(nowSeconds - 301), secret],
    ["future timestamp", "0".repeat(64), String(nowSeconds + 301), secret],
    ["missing secret", "0".repeat(64), timestamp, undefined],
  ])("rejects %s", (_label, signature, timestampValue, configuredSecret) => {
    const requestHeaders = new Headers();
    if (signature) requestHeaders.set("x-mercurius-signature", signature);
    if (timestampValue) requestHeaders.set("x-mercurius-timestamp", timestampValue);
    expect(
      verifyMarketplaceSignature(requestHeaders, body, {
        secret: configuredSecret,
        nowSeconds,
      })
    ).toBe(false);
  });

  it("rejects a signature for a modified body", () => {
    const modified = new TextEncoder().encode('{"eventId":"modified"}');
    expect(
      verifyMarketplaceSignature(headers(), modified, { secret, nowSeconds })
    ).toBe(false);
  });

  it("uses the constant-time comparison path for unequal valid-length digests", () => {
    expect(
      verifyMarketplaceSignature(headers("a".repeat(64)), body, {
        secret,
        nowSeconds,
      })
    ).toBe(false);
  });

  it("uses case-insensitive Web Headers lookup", () => {
    const requestHeaders = new Headers({
      "X-MERCURIUS-TIMESTAMP": timestamp,
      "X-MERCURIUS-SIGNATURE": createMarketplaceSignature(
        secret,
        timestamp,
        body
      ),
    });
    expect(
      verifyMarketplaceSignature(requestHeaders, body, { secret, nowSeconds })
    ).toBe(true);
  });
});
