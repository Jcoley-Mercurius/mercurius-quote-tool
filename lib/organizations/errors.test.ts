import { describe, expect, it } from "vitest";
import {
  isMissingOrganizationsSchema,
  organizationsErrorMessage,
} from "./errors";

describe("isMissingOrganizationsSchema", () => {
  it("detects missing organization_members table", () => {
    expect(
      isMissingOrganizationsSchema(
        new Error(
          "Could not find the table 'public.organization_members' in the schema cache"
        )
      )
    ).toBe(true);
  });

  it("detects missing create_organization function", () => {
    expect(
      isMissingOrganizationsSchema(
        new Error(
          "Could not find the function public.create_organization(org_name) in the schema cache"
        )
      )
    ).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isMissingOrganizationsSchema(new Error("Network error"))).toBe(false);
  });
});

describe("organizationsErrorMessage", () => {
  it("returns migration guidance when schema is missing", () => {
    expect(
      organizationsErrorMessage(
        new Error("Could not find the table 'public.organizations' in the schema cache"),
        "fallback"
      )
    ).toContain("Run migrations");
  });
});