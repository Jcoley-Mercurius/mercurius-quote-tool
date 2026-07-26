import { z } from "zod";
import { eventIdentifierSchema } from "./envelope";
import {
  jobCompletedV1Schema,
  type JobCompletedV1,
} from "./v1/job-completed";
import { jobCreatedV1Schema, type JobCreatedV1 } from "./v1/job-created";
import {
  marketplaceLeadAssignedV1Schema,
  type MarketplaceLeadAssignedV1,
} from "./v1/marketplace-lead-assigned";
import {
  opportunityCreatedV1Schema,
  type OpportunityCreatedV1,
} from "./v1/opportunity-created";
import {
  opportunityDeclinedV1Schema,
  type OpportunityDeclinedV1,
} from "./v1/opportunity-declined";
import {
  opportunityOpenedV1Schema,
  type OpportunityOpenedV1,
} from "./v1/opportunity-opened";
import {
  quoteAcceptedV1Schema,
  type QuoteAcceptedV1,
} from "./v1/quote-accepted";
import {
  quoteChangeRequestedV1Schema,
  type QuoteChangeRequestedV1,
} from "./v1/quote-change-requested";
import {
  quoteExpiredV1Schema,
  type QuoteExpiredV1,
} from "./v1/quote-expired";
import {
  quoteGeneratedV1Schema,
  type QuoteGeneratedV1,
} from "./v1/quote-generated";
import { quoteSentV1Schema, type QuoteSentV1 } from "./v1/quote-sent";
import {
  quoteStartedV1Schema,
  type QuoteStartedV1,
} from "./v1/quote-started";
import {
  quoteViewedV1Schema,
  type QuoteViewedV1,
} from "./v1/quote-viewed";

export type IntegrationEvent =
  | MarketplaceLeadAssignedV1
  | OpportunityCreatedV1
  | OpportunityOpenedV1
  | OpportunityDeclinedV1
  | QuoteStartedV1
  | QuoteGeneratedV1
  | QuoteSentV1
  | QuoteViewedV1
  | QuoteChangeRequestedV1
  | QuoteAcceptedV1
  | QuoteExpiredV1
  | JobCreatedV1
  | JobCompletedV1;

export type IntegrationEventType = IntegrationEvent["eventType"];

export const integrationEventSchemas = {
  "marketplace.lead.assigned:1": marketplaceLeadAssignedV1Schema,
  "opportunity.created:1": opportunityCreatedV1Schema,
  "opportunity.opened:1": opportunityOpenedV1Schema,
  "opportunity.declined:1": opportunityDeclinedV1Schema,
  "quote.started:1": quoteStartedV1Schema,
  "quote.generated:1": quoteGeneratedV1Schema,
  "quote.sent:1": quoteSentV1Schema,
  "quote.viewed:1": quoteViewedV1Schema,
  "quote.change_requested:1": quoteChangeRequestedV1Schema,
  "quote.accepted:1": quoteAcceptedV1Schema,
  "quote.expired:1": quoteExpiredV1Schema,
  "job.created:1": jobCreatedV1Schema,
  "job.completed:1": jobCompletedV1Schema,
} as const;

const supportedEventTypes = new Set(
  Object.keys(integrationEventSchemas).map((key) => key.split(":")[0])
);

export type IntegrationEventRegistryErrorCode =
  | "unsupported_event_type"
  | "unsupported_event_version";

export class IntegrationEventRegistryError extends Error {
  constructor(
    readonly code: IntegrationEventRegistryErrorCode,
    message: string
  ) {
    super(message);
    this.name = "IntegrationEventRegistryError";
  }
}

export function parseIntegrationEvent(input: unknown): IntegrationEvent {
  const identifier = eventIdentifierSchema.parse(input);
  if (!supportedEventTypes.has(identifier.eventType)) {
    throw new IntegrationEventRegistryError(
      "unsupported_event_type",
      `Unsupported integration event type: ${identifier.eventType}`
    );
  }

  const registryKey =
    `${identifier.eventType}:${identifier.eventVersion}` as keyof typeof integrationEventSchemas;
  const schema = integrationEventSchemas[registryKey] as
    | z.ZodType<IntegrationEvent>
    | undefined;

  if (!schema) {
    throw new IntegrationEventRegistryError(
      "unsupported_event_version",
      `Unsupported version ${identifier.eventVersion} for ${identifier.eventType}`
    );
  }

  return schema.parse(input);
}

export type SafeParseIntegrationEventResult =
  | { success: true; data: IntegrationEvent }
  | { success: false; error: z.ZodError | IntegrationEventRegistryError };

export function safeParseIntegrationEvent(
  input: unknown
): SafeParseIntegrationEventResult {
  try {
    return { success: true, data: parseIntegrationEvent(input) };
  } catch (error) {
    if (
      error instanceof z.ZodError ||
      error instanceof IntegrationEventRegistryError
    ) {
      return { success: false, error };
    }
    throw error;
  }
}

