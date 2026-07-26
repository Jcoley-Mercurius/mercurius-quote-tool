import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { OpportunityPage } from "@/lib/opportunities/types";
import { OpportunityFilters } from "./OpportunityFilters";
import {
  OpportunityListState,
  OpportunityPagination,
} from "./OpportunitiesWorkspace";

afterEach(cleanup);

const populated: OpportunityPage = {
  page: 1,
  pageSize: 20,
  totalCount: 1,
  workspaceTotalCount: 1,
  items: [
    {
      id: "opp-1",
      title: "Air conditioner repair",
      serviceType: "HVAC",
      origin: "marketplace",
      status: "new",
      customerId: null,
      customerName: null,
      propertyId: null,
      propertyLabel: null,
      assignedUserId: null,
      createdAt: "2026-07-20T12:00:00.000Z",
      updatedAt: "2026-07-21T12:00:00.000Z",
    },
  ],
};

describe("Opportunity list states", () => {
  const common = {
    assignmentLabels: new Map<string, string>(),
    onReset: vi.fn(),
    onRetry: vi.fn(),
  };

  it("renders populated partial records with a working detail link", () => {
    render(
      <OpportunityListState
        {...common}
        loading={false}
        error={null}
        result={populated}
      />
    );
    expect(screen.getByText("Air conditioner repair")).toBeInTheDocument();
    expect(screen.getByText("Customer details unavailable")).toBeInTheDocument();
    expect(screen.getByText("Property details unavailable")).toBeInTheDocument();
    expect(screen.getByText("Unassigned")).toBeInTheDocument();
    expect(screen.getByRole("link", {
      name: "View opportunity: Air conditioner repair",
    })).toHaveAttribute("href", "/opportunities/opp-1");
  });

  it("distinguishes loading, initial empty, filtered empty, and error", () => {
    const { rerender } = render(
      <OpportunityListState {...common} loading error={null} result={null} />
    );
    expect(screen.getByRole("status", { name: "Loading opportunities" })).toBeInTheDocument();

    rerender(
      <OpportunityListState
        {...common}
        loading={false}
        error={null}
        result={{ ...populated, items: [], totalCount: 0, workspaceTotalCount: 0 }}
      />
    );
    expect(screen.getByText("No opportunities yet")).toBeInTheDocument();

    rerender(
      <OpportunityListState
        {...common}
        loading={false}
        error={null}
        result={{ ...populated, items: [], totalCount: 0, workspaceTotalCount: 4 }}
      />
    );
    expect(screen.getByText("No opportunities match these filters")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset filters" })).toBeInTheDocument();

    rerender(
      <OpportunityListState
        {...common}
        loading={false}
        error="Load failed"
        result={null}
      />
    );
    expect(screen.getByText("Opportunities couldn’t be loaded")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("uses a known assignment label and safe unknown fallback", () => {
    const assigned = {
      ...populated,
      items: [
        { ...populated.items[0], id: "known", assignedUserId: "member-1" },
        { ...populated.items[0], id: "unknown", assignedUserId: "member-2" },
      ],
      totalCount: 2,
      workspaceTotalCount: 2,
    };
    render(
      <OpportunityListState
        {...common}
        loading={false}
        error={null}
        result={assigned}
        assignmentLabels={new Map([["member-1", "Alex Morgan"]])}
      />
    );
    expect(screen.getByText("Alex Morgan")).toBeInTheDocument();
    expect(screen.getByText("Assigned team member")).toBeInTheDocument();
  });
});

describe("Opportunity controls", () => {
  it("exposes labeled filters and reports changes", () => {
    const onChange = vi.fn();
    render(
      <OpportunityFilters
        filters={{ status: "active", origin: "all", assignment: "all" }}
        onChange={onChange}
      />
    );
    fireEvent.change(screen.getByLabelText("Source"), {
      target: { value: "marketplace" },
    });
    expect(onChange).toHaveBeenCalledWith({
      status: "active",
      origin: "marketplace",
      assignment: "all",
    });
    expect(screen.getByRole("option", { name: "Mine" })).toBeInTheDocument();
  });

  it("hides assignment-only filters for personal workspaces", () => {
    render(
      <OpportunityFilters
        filters={{ status: "active", origin: "all", assignment: "all" }}
        showAssignment={false}
        onChange={vi.fn()}
      />
    );
    expect(screen.queryByLabelText("Assignment")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Source")).toBeInTheDocument();
  });

  it("renders bounded previous and next pagination controls", () => {
    const onPage = vi.fn();
    render(
      <OpportunityPagination
        result={{ ...populated, totalCount: 47, workspaceTotalCount: 47 }}
        onPage={onPage}
      />
    );
    expect(screen.getByText("Showing 1–20 of 47")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPage).toHaveBeenCalledWith(2);
  });
});
