import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpportunityDetail } from "@/lib/opportunities/types";

const mocks = vi.hoisted(() => ({
  params: new URLSearchParams(),
  fetchOpportunityDetail: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => mocks.params,
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { id: "user-1", email: "vendor@example.com" } }),
}));

vi.mock("@/components/organizations/WorkspaceProvider", () => ({
  useWorkspace: () => ({
    workspace: { type: "organization", organizationId: "org-1", name: "Team" },
    isLoading: false,
  }),
}));

vi.mock("@/components/vendor/VendorProfileProvider", () => ({
  useVendorProfile: () => ({ profile: {}, pricingSettings: {} }),
}));

vi.mock("@/components/quotes/QuoteHistoryProvider", () => ({
  useQuoteHistory: () => ({
    createAndSave: vi.fn(),
    updateQuote: vi.fn(),
    getQuote: vi.fn(),
    isLoading: false,
    loadError: null,
    retryQuotes: vi.fn(),
    isRetrying: false,
  }),
}));

vi.mock("@/lib/opportunities/repository", () => ({
  fetchOpportunityDetail: mocks.fetchOpportunityDetail,
}));

vi.mock("@/components/quote-form/QuoteForm", () => ({
  QuoteForm: ({
    initialData,
    saveTarget,
    submitLabel,
  }: {
    initialData?: { serviceType: string; zipCode: string };
    saveTarget?: unknown;
    submitLabel?: string;
  }) => (
    <div>
      <span>Quote form</span>
      <span>Service: {initialData?.serviceType || "unselected"}</span>
      <span>ZIP: {initialData?.zipCode || "none"}</span>
      <span>{saveTarget ? "Save target selectable" : "Save target locked"}</span>
      <span>{submitLabel}</span>
    </div>
  ),
}));

import { QuoteFlow } from "./QuoteFlow";

afterEach(() => {
  cleanup();
  mocks.params = new URLSearchParams();
  mocks.fetchOpportunityDetail.mockReset();
});

const detail = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  title: "AC repair",
  serviceType: "hvac",
  description: "Repair the downstairs AC.",
  property: {
    id: "property-1",
    addressLine1: "10 Palm Ave",
    addressLine2: null,
    city: "Cape Coral",
    region: "FL",
    postalCode: "33904",
    countryCode: "US",
  },
} as OpportunityDetail;

describe("QuoteFlow opportunity mode", () => {
  it("loads scoped opportunity prefill and locks the save target", async () => {
    mocks.params = new URLSearchParams(`opportunityId=${detail.id}`);
    mocks.fetchOpportunityDetail.mockResolvedValue(detail);
    render(<QuoteFlow />);
    expect(screen.getByText("Loading opportunity...")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Quote form")).toBeInTheDocument());
    expect(mocks.fetchOpportunityDetail).toHaveBeenCalledWith(
      "user-1",
      { type: "organization", organizationId: "org-1", name: "Team" },
      detail.id
    );
    expect(screen.getByText("Service: hvac")).toBeInTheDocument();
    expect(screen.getByText("ZIP: 33904")).toBeInTheDocument();
    expect(screen.getByText("Save target locked")).toBeInTheDocument();
    expect(screen.getByText("Generate Quote for this Opportunity")).toBeInTheDocument();
  });

  it("requires selection for an unsupported service", async () => {
    mocks.params = new URLSearchParams(`opportunityId=${detail.id}`);
    mocks.fetchOpportunityDetail.mockResolvedValue({
      ...detail,
      serviceType: "marketplace-specialty-code",
    });
    render(<QuoteFlow />);
    await waitFor(() => expect(screen.getByText("Service: unselected")).toBeInTheDocument());
  });

  it("does not fetch opportunity prefill when quoteId has precedence", () => {
    mocks.params = new URLSearchParams(
      `quoteId=quote-1&opportunityId=${detail.id}`
    );
    render(<QuoteFlow />);
    expect(mocks.fetchOpportunityDetail).not.toHaveBeenCalled();
  });
});
