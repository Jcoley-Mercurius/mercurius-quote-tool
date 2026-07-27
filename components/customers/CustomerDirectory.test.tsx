import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { CustomerDirectoryItem } from "@/lib/customers/types";
import { CustomerCard } from "./CustomerDirectory";

afterEach(cleanup);

const item: CustomerDirectoryItem = {
  id: "11111111-1111-4111-8111-111111111111",
  displayName: "Jordan Lee",
  companyName: null,
  email: "jordan@example.com",
  phone: "239-555-0100",
  preferredContactMethod: "email",
  source: "marketplace",
  primaryProperty: "10 Palm Ave, Cape Coral, FL 33904",
  openOpportunityCount: 2,
  linkedQuoteCount: 1,
  latestActivityAt: "2026-07-25T10:00:00Z",
  createdAt: "2026-07-20T10:00:00Z",
  updatedAt: "2026-07-25T10:00:00Z",
  archivedAt: null,
};

describe("CustomerCard", () => {
  it("renders an accessible detail link and honest linked aggregates", () => {
    render(<ul><CustomerCard item={item} /></ul>);
    expect(screen.getByRole("link", { name: "Jordan Lee" })).toHaveAttribute(
      "href",
      `/customers/${item.id}`
    );
    expect(screen.getByText("Open opportunities")).toBeInTheDocument();
    expect(screen.getByText("Linked quotes")).toBeInTheDocument();
    expect(screen.getByText("Source: Marketplace")).toBeInTheDocument();
    expect(screen.queryByText(item.id)).not.toBeInTheDocument();
  });

  it("wraps safe unavailable aggregate and contact states", () => {
    render(<ul><CustomerCard item={{
      ...item,
      email: null,
      phone: null,
      primaryProperty: null,
      openOpportunityCount: null,
      linkedQuoteCount: null,
    }} /></ul>);
    expect(screen.getByText("Contact details unavailable")).toBeInTheDocument();
    expect(screen.getByText("No linked property")).toBeInTheDocument();
    expect(screen.getAllByText("Unavailable")).toHaveLength(2);
  });
});
