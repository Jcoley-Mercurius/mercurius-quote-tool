const ids = {
  organization: "00000000-0000-4000-8000-000000000001",
  marketplaceVendor: "00000000-0000-4000-8000-000000000002",
  marketplaceLead: "00000000-0000-4000-8000-000000000003",
  marketplaceRequest: "00000000-0000-4000-8000-000000000004",
  marketplaceHomeowner: "00000000-0000-4000-8000-000000000005",
  marketplaceProperty: "00000000-0000-4000-8000-000000000006",
  customer: "00000000-0000-4000-8000-000000000007",
  property: "00000000-0000-4000-8000-000000000008",
  opportunity: "00000000-0000-4000-8000-000000000009",
  quote: "00000000-0000-4000-8000-000000000010",
  acceptance: "00000000-0000-4000-8000-000000000011",
  changeRequest: "00000000-0000-4000-8000-000000000012",
  job: "00000000-0000-4000-8000-000000000013",
  user: "00000000-0000-4000-8000-000000000014",
} as const;

const timestamp = "2026-07-25T14:30:00-04:00";
const metadata = {
  correlationId: "00000000-0000-4000-8000-000000000100",
  environment: "test",
  schemaRevision: 1,
} as const;

function eventId(sequence: number): string {
  return `00000000-0000-4000-8000-${sequence.toString().padStart(12, "0")}`;
}

function entity(entityType: string, entityId: string) {
  return { entityType, entityId };
}

const vendorBase = {
  eventVersion: 1,
  occurredAt: timestamp,
  sourceSystem: "vendor_os",
  organizationId: ids.organization,
  actor: { actorType: "vendor_os_user", userId: ids.user },
  metadata,
} as const;

export const marketplaceLeadAssignedV1Fixture = {
  eventId: eventId(201),
  eventType: "marketplace.lead.assigned",
  eventVersion: 1,
  occurredAt: timestamp,
  sourceSystem: "marketplace",
  organizationId: ids.organization,
  actor: {
    actorType: "system",
    system: "marketplace",
  },
  entities: [
    entity("organization", ids.organization),
    entity("marketplaceVendor", ids.marketplaceVendor),
    entity("marketplaceLead", ids.marketplaceLead),
    entity("marketplaceRequest", ids.marketplaceRequest),
  ],
  metadata,
  data: {
    marketplaceLeadId: ids.marketplaceLead,
    marketplaceRequestId: ids.marketplaceRequest,
    marketplaceVendorId: ids.marketplaceVendor,
    marketplaceHomeownerId: ids.marketplaceHomeowner,
    marketplacePropertyId: ids.marketplaceProperty,
    assignedAt: timestamp,
    serviceCategory: {
      code: "plumbing",
      displayName: "Plumbing",
    },
    requestTitle: "Example fixture service request",
    requestDescription:
      "Reserved example request describing a fixture that needs assessment.",
    customer: {
      displayName: "Example Homeowner",
      email: "homeowner@example.com",
      phone: "+1-202-555-0100",
    },
    property: {
      addressLine1: "123 Example Street",
      city: "Example City",
      region: "FL",
      postalCode: "33900",
      countryCode: "US",
    },
    preferredTiming: "Weekday morning",
    budgetRange: {
      minimumAmountMinor: 20_000,
      maximumAmountMinor: 50_000,
      currency: "USD",
    },
  },
} as const;

export const opportunityCreatedV1Fixture = {
  ...vendorBase,
  eventId: eventId(202),
  eventType: "opportunity.created",
  entities: [
    entity("organization", ids.organization),
    entity("marketplaceLead", ids.marketplaceLead),
    entity("marketplaceRequest", ids.marketplaceRequest),
    entity("opportunity", ids.opportunity),
  ],
  data: {
    opportunityId: ids.opportunity,
    origin: "marketplace",
    marketplaceLeadId: ids.marketplaceLead,
    marketplaceRequestId: ids.marketplaceRequest,
    status: "new",
    createdAt: timestamp,
  },
} as const;

export const opportunityOpenedV1Fixture = {
  ...vendorBase,
  eventId: eventId(203),
  eventType: "opportunity.opened",
  entities: [
    entity("organization", ids.organization),
    entity("opportunity", ids.opportunity),
  ],
  data: { opportunityId: ids.opportunity, openedAt: timestamp },
} as const;

export const opportunityDeclinedV1Fixture = {
  ...vendorBase,
  eventId: eventId(204),
  eventType: "opportunity.declined",
  entities: [
    entity("organization", ids.organization),
    entity("opportunity", ids.opportunity),
  ],
  data: {
    opportunityId: ids.opportunity,
    reasonCode: "unavailable",
    declinedAt: timestamp,
  },
} as const;

const quoteEntities = [
  entity("organization", ids.organization),
  entity("opportunity", ids.opportunity),
  entity("quote", ids.quote),
];

export const quoteStartedV1Fixture = {
  ...vendorBase,
  eventId: eventId(205),
  eventType: "quote.started",
  entities: quoteEntities,
  data: {
    quoteId: ids.quote,
    opportunityId: ids.opportunity,
    revisionNumber: 1,
    startedAt: timestamp,
  },
} as const;

export const quoteGeneratedV1Fixture = {
  ...vendorBase,
  eventId: eventId(206),
  eventType: "quote.generated",
  entities: quoteEntities,
  data: {
    quoteId: ids.quote,
    opportunityId: ids.opportunity,
    revisionNumber: 1,
    generatedAt: timestamp,
    source: "ai",
  },
} as const;

export const quoteSentV1Fixture = {
  ...vendorBase,
  eventId: eventId(207),
  eventType: "quote.sent",
  entities: quoteEntities,
  data: {
    quoteId: ids.quote,
    opportunityId: ids.opportunity,
    revisionNumber: 1,
    sentAt: timestamp,
    expiresAt: "2026-08-24T14:30:00-04:00",
  },
} as const;

export const quoteViewedV1Fixture = {
  ...vendorBase,
  eventId: eventId(208),
  eventType: "quote.viewed",
  actor: {
    actorType: "marketplace_homeowner",
    marketplaceHomeownerId: ids.marketplaceHomeowner,
  },
  entities: quoteEntities,
  data: {
    quoteId: ids.quote,
    opportunityId: ids.opportunity,
    revisionNumber: 1,
    viewedAt: timestamp,
  },
} as const;

export const quoteChangeRequestedV1Fixture = {
  ...vendorBase,
  eventId: eventId(209),
  eventType: "quote.change_requested",
  actor: {
    actorType: "marketplace_homeowner",
    marketplaceHomeownerId: ids.marketplaceHomeowner,
  },
  entities: [
    ...quoteEntities,
    entity("changeRequest", ids.changeRequest),
  ],
  data: {
    quoteId: ids.quote,
    opportunityId: ids.opportunity,
    revisionNumber: 1,
    changeRequestId: ids.changeRequest,
    requestedAt: timestamp,
  },
} as const;

export const quoteAcceptedV1Fixture = {
  ...vendorBase,
  eventId: eventId(210),
  eventType: "quote.accepted",
  actor: {
    actorType: "marketplace_homeowner",
    marketplaceHomeownerId: ids.marketplaceHomeowner,
  },
  entities: [
    ...quoteEntities,
    entity("acceptance", ids.acceptance),
  ],
  data: {
    quoteId: ids.quote,
    opportunityId: ids.opportunity,
    revisionNumber: 1,
    acceptanceId: ids.acceptance,
    acceptedAt: timestamp,
    amountMinor: 42_500,
    currency: "USD",
  },
} as const;

export const quoteExpiredV1Fixture = {
  ...vendorBase,
  eventId: eventId(211),
  eventType: "quote.expired",
  actor: { actorType: "system", system: "vendor_os" },
  entities: quoteEntities,
  data: {
    quoteId: ids.quote,
    opportunityId: ids.opportunity,
    revisionNumber: 1,
    expiredAt: timestamp,
  },
} as const;

const jobEntities = [
  entity("organization", ids.organization),
  entity("opportunity", ids.opportunity),
  entity("quote", ids.quote),
  entity("job", ids.job),
];

export const jobCreatedV1Fixture = {
  ...vendorBase,
  eventId: eventId(212),
  eventType: "job.created",
  entities: jobEntities,
  data: {
    jobId: ids.job,
    opportunityId: ids.opportunity,
    acceptedQuoteId: ids.quote,
    createdAt: timestamp,
  },
} as const;

export const jobCompletedV1Fixture = {
  ...vendorBase,
  eventId: eventId(213),
  eventType: "job.completed",
  entities: jobEntities,
  data: {
    jobId: ids.job,
    opportunityId: ids.opportunity,
    completedAt: timestamp,
    completionCode: "completed",
  },
} as const;

export const integrationEventV1Fixtures = [
  marketplaceLeadAssignedV1Fixture,
  opportunityCreatedV1Fixture,
  opportunityOpenedV1Fixture,
  opportunityDeclinedV1Fixture,
  quoteStartedV1Fixture,
  quoteGeneratedV1Fixture,
  quoteSentV1Fixture,
  quoteViewedV1Fixture,
  quoteChangeRequestedV1Fixture,
  quoteAcceptedV1Fixture,
  quoteExpiredV1Fixture,
  jobCreatedV1Fixture,
  jobCompletedV1Fixture,
] as const;

export { ids as integrationEventFixtureIds };

