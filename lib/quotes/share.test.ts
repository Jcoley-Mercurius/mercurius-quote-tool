import { describe, expect, it } from "vitest";
import { buildClientQuoteUrl, generateShareToken } from "./share";

describe("generateShareToken", () => {
  it("returns a 64-character hex string", () => {
    const token = generateShareToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("generates unique tokens", () => {
    const a = generateShareToken();
    const b = generateShareToken();
    expect(a).not.toBe(b);
  });
});

describe("buildClientQuoteUrl", () => {
  it("builds a quote URL from token and origin", () => {
    expect(buildClientQuoteUrl("abc123", "https://app.example.com")).toBe(
      "https://app.example.com/quote/abc123"
    );
  });
});