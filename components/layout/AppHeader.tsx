"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { CreateOrganizationDialog } from "@/components/organizations/CreateOrganizationDialog";
import { WorkspaceSwitcher } from "@/components/organizations/WorkspaceSwitcher";
import { useWorkspace, useWorkspaceLabel } from "@/components/organizations/WorkspaceProvider";
import { useVendorProfile } from "@/components/vendor/VendorProfileProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import { workspaceLabel as formatWorkspaceLabel, type Workspace } from "@/lib/organizations/types";
import { toastError, toastInfo, toastSuccess } from "@/lib/ui/toast";
import { getVendorLogoSrc, hasCustomLogo } from "@/lib/vendor/logo";
import { WorkspaceNavigation } from "./workspace-navigation";

export function AppHeader() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { profile } = useVendorProfile();
  const {
    workspace,
    memberships,
    isLoading: workspaceLoading,
    loadError,
    isRetrying,
    schemaAvailable,
    switchWorkspace,
    retryOrganizations,
  } = useWorkspace();
  const activeWorkspaceLabel = useWorkspaceLabel();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpenAt, setMobileMenuOpenAt] = useState<string | null>(null);
  const [createOrgOpen, setCreateOrgOpen] = useState(false);

  const isAuthPage =
    pathname === "/login" ||
    pathname === "/auth/reset-password" ||
    pathname === "/request-repair" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/quote/");

  const showNav = Boolean(user && !isAuthPage);
  const mobileMenuOpen = mobileMenuOpenAt === pathname;

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpenAt(null);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpenAt((current) => (current === pathname ? null : pathname));
  }, [pathname]);

  useFocusTrap(mobileMenuRef, mobileMenuOpen);

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileMenu();
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMobileMenu, mobileMenuOpen]);

  const handleWorkspaceSwitch = useCallback(
    (next: Workspace) => {
      switchWorkspace(next);
      toastInfo(`Switched to ${formatWorkspaceLabel(next)} workspace.`, {
        duration: 2500,
      });
    },
    [switchWorkspace]
  );

  const handleSignOut = useCallback(async () => {
    closeMobileMenu();
    const result = await signOut();
    if (result.error) {
      toastError(result.error, "Could not sign out. Please try again.");
    } else {
      toastSuccess("Signed out successfully.");
    }
  }, [closeMobileMenu, signOut]);

  if (pathname.startsWith("/quote/") || pathname === "/login") {
    return null;
  }

  return (
    <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1600px] items-center justify-between px-4 sm:px-6">
        <Link href={user ? "/command-center" : "/"} className="flex min-w-0 items-center gap-3">
          {hasCustomLogo(profile) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={getVendorLogoSrc(profile) ?? undefined}
              alt={profile.businessName || "Company logo"}
              className="h-9 w-auto max-w-[90px] shrink-0 object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/mercurius-logo.png"
              alt="Mercurius Logo"
              className="h-10 w-auto shrink-0"
            />
          )}
          <div className="min-w-0">
            <span className="block truncate text-base font-semibold tracking-tight text-neutral-900 sm:text-lg">
              {profile.businessName || "Mercurius"}
            </span>
            {profile.businessName && (
              <span className="mt-0.5 block truncate text-xs text-slate-400">
                Powered by Mercurius
              </span>
            )}
          </div>
        </Link>

        {showNav && (
          <div className="hidden items-center gap-2 md:flex">
            <WorkspaceSwitcher />
            <span className="hidden max-w-[140px] truncate px-2 text-xs text-slate-400 lg:inline">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            >
              Sign Out
            </button>
          </div>
        )}

        {showNav && (
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-600 outline-none transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 md:hidden"
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            onClick={toggleMobileMenu}
          >
            {mobileMenuOpen ? (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-6 w-6"
                aria-hidden
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                className="h-6 w-6"
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5"
                />
              </svg>
            )}
          </button>
        )}
      </div>

      {showNav && mobileMenuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/30 md:hidden"
            aria-label="Close menu"
            onClick={closeMobileMenu}
          />
          <div
            ref={mobileMenuRef}
            id="mobile-nav-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col border-l border-slate-200 bg-white shadow-xl md:hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <span className="text-sm font-semibold text-slate-900">Menu</span>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 outline-none transition-colors hover:bg-slate-50 hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
                aria-label="Close menu"
                onClick={closeMobileMenu}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="h-5 w-5"
                  aria-hidden
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-4 py-4">
              <p className="px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Workspace
              </p>
              {workspaceLoading ? (
                <div className="mx-4 flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  <LoadingSpinner size="sm" />
                  Loading workspaces...
                </div>
              ) : (
                <>
                  {loadError && (
                    <div className="mx-4 mb-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                      <p className="font-medium">Team list unavailable</p>
                      <p className="mt-1 leading-relaxed">{loadError}</p>
                      <button
                        type="button"
                        onClick={() => void retryOrganizations()}
                        disabled={isRetrying}
                        className="mt-2 inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-white px-2.5 py-1 font-medium disabled:opacity-60"
                      >
                        {isRetrying ? (
                          <>
                            <LoadingSpinner size="sm" />
                            Retrying...
                          </>
                        ) : (
                          "Retry"
                        )}
                      </button>
                    </div>
                  )}
                  <MobileWorkspaceOption
                    label="Personal"
                    selected={workspace.type === "personal"}
                    onSelect={() => {
                      handleWorkspaceSwitch({ type: "personal" });
                      closeMobileMenu();
                    }}
                  />
                  {memberships.map((membership) => (
                    <MobileWorkspaceOption
                      key={membership.organizationId}
                      label={membership.organizationName}
                      selected={
                        workspace.type === "organization" &&
                        workspace.organizationId === membership.organizationId
                      }
                      onSelect={() => {
                        handleWorkspaceSwitch({
                          type: "organization",
                          organizationId: membership.organizationId,
                          name: membership.organizationName,
                        });
                        closeMobileMenu();
                      }}
                    />
                  ))}
                  {memberships.length === 0 && !loadError && schemaAvailable && (
                    <p className="px-4 py-2 text-xs text-slate-500">
                      No team workspaces yet.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      closeMobileMenu();
                      setCreateOrgOpen(true);
                    }}
                    disabled={!schemaAvailable}
                    className="mx-4 mt-2 min-h-11 rounded-xl border border-dashed border-emerald-200 px-4 py-3 text-left text-sm font-medium text-emerald-700 outline-none hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:text-slate-400"
                  >
                    Create organization
                  </button>
                </>
              )}
              <p className="mt-4 px-4 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Navigation
              </p>
              <WorkspaceNavigation mobile onNavigate={closeMobileMenu} />
            </div>

            <div className="border-t border-slate-100 px-5 py-4">
              <p className="mb-2 text-xs text-slate-500">
                Active workspace:{" "}
                <span className="font-medium text-slate-700">{activeWorkspaceLabel}</span>
              </p>
              {user?.email && (
                <p className="mb-3 truncate text-xs text-slate-400">{user.email}</p>
              )}
              <button
                type="button"
                onClick={() => void handleSignOut()}
                className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition-colors hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      <CreateOrganizationDialog
        open={createOrgOpen}
        onClose={() => setCreateOrgOpen(false)}
      />
    </nav>
  );
}

function MobileWorkspaceOption({
  label,
  selected,
  onSelect,
}: {
  label: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "min-h-11 rounded-xl px-4 py-3 text-left text-base font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-inset",
        selected
          ? "bg-emerald-50 text-emerald-700"
          : "text-slate-700 hover:bg-slate-50 hover:text-slate-900",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
