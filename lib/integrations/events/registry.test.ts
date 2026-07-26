import { describe, expect, expectTypeOf, it } from "vitest";
import {
  integrationEventFixtureIds,
  integrationEventV1Fixtures,
  marketplaceLeadAssignedV1Fixture,
  quoteAcceptedV1Fixture,
  quoteChangeRequestedV1Fixture,
  quoteSentV1Fixture,
} from "./__fixtures__/v1";
import {
  IntegrationEventRegistryError,
  parseIntegrationEvent,
  safeParseIntegrationEvent,
  type IntegrationEvent,
} from "./registry";

function mutable<T>(value: T): Record<string, unknown> {
  return structuredClone(value) as Record<string, unknown>;
}

function expectInvalid(input: unknown): void {
  expect(safeParseIntegrationEvent(input).success).toBe(false);
}

describe("integration event registry", () => {
  it("parses all 13 deterministic v1 fixtures", () => {
    expect(integrationEventV1Fixtures).toHaveLength(13);
    for (const fixture of integrationEventV1Fixtures) {
      const parsed = parseIntegrationEvent(fixture);
      expect(parsed.eventType).toBe(fixture.eventType);
      expect(parsed.eventVersion).toBe(1);
    }
  });

  it("returns a union discriminated by eventType", () => {
    const parsed: IntegrationEvent = parseIntegrationEvent(
      quoteAcceptedV1Fixture
    );
    if (parsed.eventType === "quote.accepted") {
      expectTypeOf(parsed.data.amountMinor).toBeNumber();
      expect(parsed.data.acceptanceId).toBe(
        integrationEventFixtureIds.acceptance
      );
    } else {
      throw new Error("Expected quote.accepted");
    }
  });

  it("defaults omitted metadata to an empty object", () => {
    const fixture = mutable(quoteSentV1Fixture);
    delete fixture.metadata;
    expect(parseIntegrationEvent(fixture).metadata).toEqual({});
  });

  it("represents related entity UUIDs consistently", () => {
    const parsed = parseIntegrationEvent(quoteAcceptedV1Fixture);
    if (parsed.eventType !== "quote.accepted") {
      throw new Error("Expected quote.accepted");
    }
    expect(parsed.entities).toEqual(
      expect.arrayContaining([
        {
          entityType: "opportunity",
          entityId: parsed.data.opportunityId,
        },
        { entityType: "quote", entityId: parsed.data.quoteId },
        {
          entityType: "acceptance",
          entityId: parsed.data.acceptanceId,
        },
      ])
    );
  });

  describe("invalid envelope behavior", () => {
    it("rejects invalid UUIDs and a missing organization", () => {
      const invalidUuid = mutable(quoteSentV1Fixture);
      invalidUuid.eventId = "not-a-uuid";
      expectInvalid(invalidUuid);

      const missingOrganization = mutable(quoteSentV1Fixture);
      delete missingOrganization.organizationId;
      expectInvalid(missingOrganization);
    });

    it("rejects invalid timestamps, including timestamps without an offset", () => {
      const invalidTimestamp = mutable(quoteSentV1Fixture);
      invalidTimestamp.occurredAt = "not-a-timestamp";
      expectInvalid(invalidTimestamp);

      const noOffset = mutable(quoteSentV1Fixture);
      noOffset.occurredAt = "2026-07-25T14:30:00";
      expectInvalid(noOffset);
    });

    it("rejects invalid sources, empty entities, and unknown envelope keys", () => {
      const invalidSource = mutable(quoteSentV1Fixture);
      invalidSource.sourceSystem = "other";
      expectInvalid(invalidSource);

      const emptyEntities = mutable(quoteSentV1Fixture);
      emptyEntities.entities = [];
      expectInvalid(emptyEntities);

      const unknownKey = mutable(quoteSentV1Fixture);
      unknownKey.unreviewed = true;
      expectInvalid(unknownKey);
    });

    it("distinguishes unsupported types and versions", () => {
      const unsupportedType = mutable(quoteSentV1Fixture);
      unsupportedType.eventType = "quote.deleted";
      const typeResult = safeParseIntegrationEvent(unsupportedType);
      expect(typeResult.success).toBe(false);
      if (!typeResult.success) {
        expect(typeResult.error).toBeInstanceOf(IntegrationEventRegistryError);
        expect((typeResult.error as IntegrationEventRegistryError).code).toBe(
          "unsupported_event_type"
        );
      }

      const unsupportedVersion = mutable(quoteSentV1Fixture);
      unsupportedVersion.eventVersion = 2;
      const versionResult = safeParseIntegrationEvent(unsupportedVersion);
      expect(versionResult.success).toBe(false);
      if (!versionResult.success) {
        expect(
          (versionResult.error as IntegrationEventRegistryError).code
        ).toBe("unsupported_event_version");
      }
    });

    it("rejects type/version and source/schema mismatches", () => {
      const wrongPayload = mutable(quoteAcceptedV1Fixture);
      wrongPayload.eventType = "quote.sent";
      expectInvalid(wrongPayload);

      const wrongSource = mutable(marketplaceLeadAssignedV1Fixture);
      wrongSource.sourceSystem = "vendor_os";
      expectInvalid(wrongSource);
    });
  });

  describe("metadata restrictions", () => {
    it.each([
      ["nested objects", { traceId: { nested: true } }],
      ["arrays", { traceId: ["trace"] }],
      ["unknown keys", { deployment: "test" }],
      [
        "too many keys",
        {
          correlationId: "00000000-0000-4000-8000-000000000100",
          causationId: "00000000-0000-4000-8000-000000000101",
          traceId: "trace",
          environment: "test",
          schemaRevision: 1,
          sixthKey: true,
        },
      ],
      ["long strings", { traceId: "x".repeat(129) }],
    ])("rejects %s", (_label, metadata) => {
      const fixture = mutable(quoteSentV1Fixture);
      fixture.metadata = metadata;
      expectInvalid(fixture);
    });

    it.each([
      "name",
      "email",
      "phone",
      "address",
      "message",
      "token",
      "signature",
      "ip",
    ])("rejects the sensitive-looking key %s", (key) => {
      const fixture = mutable(quoteSentV1Fixture);
      fixture.metadata = { [key]: "forbidden" };
      expectInvalid(fixture);
    });
  });

  describe("payload restrictions", () => {
    it("rejects unknown payload keys and the wrong event payload", () => {
      const unknownPayloadKey = mutable(quoteSentV1Fixture);
      (unknownPayloadKey.data as Record<string, unknown>).recipientEmail =
        "recipient@example.com";
      expectInvalid(unknownPayloadKey);

      const wrongPayload = mutable(quoteSentV1Fixture);
      wrongPayload.data = structuredClone(quoteAcceptedV1Fixture.data);
      expectInvalid(wrongPayload);
    });

    it("rejects invalid, negative, and floating-point money", () => {
      for (const [field, value] of [
        ["currency", "EUR"],
        ["amountMinor", -1],
        ["amountMinor", 42.5],
      ] as const) {
        const fixture = mutable(quoteAcceptedV1Fixture);
        (fixture.data as Record<string, unknown>)[field] = value;
        expectInvalid(fixture);
      }
    });

    it("requires opportunityId for quote events", () => {
      const fixture = mutable(quoteSentV1Fixture);
      delete (fixture.data as Record<string, unknown>).opportunityId;
      expectInvalid(fixture);
    });

    it.each(["signature", "ipAddress", "shareToken"])(
      "rejects %s from quote.accepted",
      (field) => {
        const fixture = mutable(quoteAcceptedV1Fixture);
        (fixture.data as Record<string, unknown>)[field] = "forbidden";
        expectInvalid(fixture);
      }
    );

    it("rejects share tokens from quote.sent", () => {
      const fixture = mutable(quoteSentV1Fixture);
      (fixture.data as Record<string, unknown>).shareToken = "forbidden";
      expectInvalid(fixture);
    });

    it("rejects homeowner free text from quote.change_requested", () => {
      const fixture = mutable(quoteChangeRequestedV1Fixture);
      (fixture.data as Record<string, unknown>).message =
        "Unreviewed homeowner text";
      expectInvalid(fixture);
    });
  });
});
