import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkspaceNavigation, isWorkspaceRouteActive } from "./workspace-navigation";

vi.mock("next/navigation", () => ({ usePathname: () => "/quotes" }));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

afterEach(cleanup);

describe("WorkspaceNavigation", () => {
  it("renders existing and placeholder destinations in product order", () => {
    render(<WorkspaceNavigation />);
    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveTextContent("Business Command Center");
    expect(screen.getByRole("link", { name: /Quotes/ })).toHaveAttribute("href", "/quotes");
    expect(screen.getByRole("link", { name: /Settings/ })).toHaveAttribute("href", "/settings");
    expect(links.at(-1)).toHaveTextContent("Settings");
  });

  it("marks the current destination and supports nested paths", () => {
    render(<WorkspaceNavigation />);
    expect(screen.getByRole("link", { name: /Quotes/ })).toHaveAttribute("aria-current", "page");
    expect(isWorkspaceRouteActive("/quotes/example", "/quotes")).toBe(true);
    expect(isWorkspaceRouteActive("/quote", "/quotes")).toBe(false);
  });
});
