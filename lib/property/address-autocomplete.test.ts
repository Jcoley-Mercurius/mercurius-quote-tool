import { describe, expect, it } from "vitest";
import { getAddressSuggestions } from "./address-autocomplete";
import { getLocalAddressSuggestions } from "./swfl-property-data";

describe("getLocalAddressSuggestions", () => {
  it("returns demo addresses matching partial street input", () => {
    const results = getLocalAddressSuggestions("47th terrace");

    expect(results.some((item) => item.address.includes("47th Terrace"))).toBe(
      true
    );
  });

  it("returns SWFL zip suggestions when searching by zip prefix", () => {
    const results = getLocalAddressSuggestions("33904");

    expect(results.some((item) => item.zipCode === "33904")).toBe(true);
  });
});

describe("getAddressSuggestions", () => {
  it("returns local suggestions when Google Places is not configured", async () => {
    const result = await getAddressSuggestions("cape coral");

    expect(result.googleEnabled).toBe(false);
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.provider).toBe("local");
  });
});