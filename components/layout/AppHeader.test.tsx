import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_VENDOR_PROFILE } from "@/lib/vendor/defaults";
import { AppHeader } from "./AppHeader";

const mockSignOut = vi.fn().mockResolvedValue({ error: null });
const mockUsePathname = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    onClick,
    className,
  }: {
    children: React.ReactNode;
    href: string;
    onClick?: () => void;
    className?: string;
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/components/vendor/VendorProfileProvider", () => ({
  useVendorProfile: () => ({ profile: DEFAULT_VENDOR_PROFILE, isLoading: false }),
}));

vi.mock("@/components/organizations/WorkspaceProvider", () => ({
  useWorkspace: () => ({
    workspace: { type: "personal" as const },
    memberships: [],
    switchWorkspace: vi.fn(),
    isLoading: false,
    loadError: null,
    isRetrying: false,
    schemaAvailable: true,
    retryOrganizations: vi.fn(),
    refreshOrganizations: vi.fn(),
    createNewOrganization: vi.fn(),
  }),
  useWorkspaceLabel: () => "Personal",
}));

vi.mock("@/components/organizations/WorkspaceSwitcher", () => ({
  WorkspaceSwitcher: () => null,
}));

vi.mock("@/lib/ui/toast", () => ({
  toastError: vi.fn(),
  toastSuccess: vi.fn(),
}));

function createUser(email = "contractor@example.com"): User {
  return { email } as User;
}

function renderHeader() {
  const user = userEvent.setup();
  render(<AppHeader />);
  return { user, nav: screen.getByRole("navigation") };
}

function getMobileMenuToggle(
  nav: HTMLElement,
  state: "open" | "closed" = "closed"
) {
  if (state === "open") {
    return within(nav).getByRole("button", { name: "Close menu", expanded: true });
  }

  return within(nav).getByRole("button", { name: "Open menu", expanded: false });
}

describe("AppHeader mobile navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePathname.mockReturnValue("/");
    mockUseAuth.mockReturnValue({
      user: createUser(),
      signOut: mockSignOut,
    });
  });

  afterEach(() => {
    cleanup();
    document.body.style.overflow = "";
  });

  it("shows the hamburger control with mobile-only styling when logged in", () => {
    const { nav } = renderHeader();

    const menuToggle = getMobileMenuToggle(nav);
    expect(menuToggle).toBeInTheDocument();
    expect(menuToggle).toHaveClass("md:hidden");
    expect(within(nav).getByRole("link", { name: "New Quote" }).parentElement).toHaveClass(
      "hidden",
      "md:flex"
    );
  });

  it("opens and closes the drawer when toggling the hamburger", async () => {
    const { user, nav } = renderHeader();

    await user.click(getMobileMenuToggle(nav));
    expect(screen.getByRole("dialog", { name: "Navigation menu" })).toBeInTheDocument();

    await user.click(getMobileMenuToggle(nav, "open"));
    expect(screen.queryByRole("dialog", { name: "Navigation menu" })).not.toBeInTheDocument();
    expect(getMobileMenuToggle(nav)).toBeInTheDocument();
  });

  it("closes the drawer when a mobile nav link is clicked", async () => {
    const { user, nav } = renderHeader();

    await user.click(getMobileMenuToggle(nav));
    const drawer = screen.getByRole("dialog", { name: "Navigation menu" });
    await user.click(within(drawer).getByRole("link", { name: "History" }));

    expect(screen.queryByRole("dialog", { name: "Navigation menu" })).not.toBeInTheDocument();
  });

  it("closes the drawer when the backdrop is clicked", async () => {
    const { user, nav } = renderHeader();

    await user.click(getMobileMenuToggle(nav));
    const backdrop = document.querySelector("button.fixed.inset-0");

    expect(backdrop).not.toBeNull();
    await user.click(backdrop!);

    expect(screen.queryByRole("dialog", { name: "Navigation menu" })).not.toBeInTheDocument();
  });

  it("closes the drawer when Escape is pressed", async () => {
    const { user, nav } = renderHeader();

    await user.click(getMobileMenuToggle(nav));
    expect(screen.getByRole("dialog", { name: "Navigation menu" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Navigation menu" })).not.toBeInTheDocument();
  });

  it("hides mobile navigation when the user is not logged in", () => {
    mockUseAuth.mockReturnValue({
      user: null,
      signOut: mockSignOut,
    });

    const { nav } = renderHeader();

    expect(within(nav).queryByRole("button", { name: "Open menu" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "New Quote" })).not.toBeInTheDocument();
  });

  it("hides mobile navigation on auth pages even when logged in", () => {
    mockUsePathname.mockReturnValue("/login");

    const { nav } = renderHeader();

    expect(within(nav).queryByRole("button", { name: "Open menu" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "New Quote" })).not.toBeInTheDocument();
  });

  it("traps focus inside the drawer and wraps from last to first item", async () => {
    const { user, nav } = renderHeader();

    await user.click(getMobileMenuToggle(nav));
    const drawer = screen.getByRole("dialog", { name: "Navigation menu" });
    const drawerCloseButton = within(drawer).getAllByRole("button", { name: "Close menu" })[0];
    const signOutButton = within(drawer).getByRole("button", { name: "Sign Out" });

    signOutButton.focus();
    expect(signOutButton).toHaveFocus();

    await user.tab();
    expect(drawerCloseButton).toHaveFocus();
  });
});