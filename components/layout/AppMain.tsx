"use client";

import { usePathname } from "next/navigation";
import { WorkspaceStatusBanner } from "@/components/organizations/WorkspaceStatusBanner";
import { VendorProfileNudge } from "@/components/vendor/VendorProfileNudge";
import { WorkspaceNavigation } from "./workspace-navigation";

export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The auth screen renders its own full-bleed split-screen layout.
  const isPublic =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/request-repair" ||
    pathname === "/auth/reset-password" ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/quote/");

  if (pathname === "/login") {
    return <main>{children}</main>;
  }

  if (isPublic) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {children}
      </main>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1600px]">
      <aside
        className="sticky top-[73px] hidden h-[calc(100vh-73px)] w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white px-3 py-5 md:block"
        aria-label="Vendor workspace"
      >
        <WorkspaceNavigation />
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
        <div className="mx-auto max-w-6xl">
          <WorkspaceStatusBanner />
          <VendorProfileNudge />
          {children}
        </div>
      </main>
    </div>
  );
}
