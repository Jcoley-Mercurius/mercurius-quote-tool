import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetricState } from "./MetricState";

describe("MetricState", () => {
  it("renders positive and valid zero values", () => {
    const { rerender } = render(<MetricState result={{ status: "ready", value: 1200 }} />);
    expect(screen.getByText("1,200")).toBeInTheDocument();
    rerender(<MetricState result={{ status: "ready", value: 0 }} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("distinguishes unavailable and error states", () => {
    const { rerender } = render(
      <MetricState result={{ status: "unavailable", reason: "Unsupported" }} />
    );
    expect(screen.getByText("Unavailable")).toBeInTheDocument();
    rerender(<MetricState result={{ status: "error", message: "Failed" }} />);
    expect(screen.getByText("Couldn't load")).toBeInTheDocument();
  });
});
