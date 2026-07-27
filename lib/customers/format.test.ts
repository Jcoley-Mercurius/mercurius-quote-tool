import { describe, expect, it } from "vitest";
import {
  cleanCustomerSearch,
  formatCustomerProperty,
  normalizedPhoneSearch,
  postgrestSearchPattern,
} from "./format";

describe("customer formatting", () => {
  it("trims and bounds search without retaining PostgREST control characters", () => {
    expect(cleanCustomerSearch("  Jordan Lee  ")).toBe("Jordan Lee");
    expect(postgrestSearchPattern("Jordan,(_)%")).toBe("Jordan");
  });

  it("normalizes practical phone search input without changing stored values", () => {
    expect(normalizedPhoneSearch("+1 (239) 555-0100")).toBe("12395550100");
  });

  it("formats complete and missing property addresses safely", () => {
    expect(formatCustomerProperty({
      address_line1: "10 Palm Ave",
      address_line2: null,
      city: "Cape Coral",
      region: "FL",
      postal_code: "33904",
    })).toBe("10 Palm Ave, Cape Coral, FL 33904");
    expect(formatCustomerProperty({
      address_line1: null,
      address_line2: null,
      city: null,
      region: null,
      postal_code: null,
    })).toBe("Address unavailable");
  });
});
