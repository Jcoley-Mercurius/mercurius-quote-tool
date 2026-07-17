"use client";

import { usePathname } from "next/navigation";
import { WorkspaceStatusBanner } from "@/components/organizations/WorkspaceStatusBanner";
import { VendorProfileNudge } from "@/components/vendor/VendorProfileNudge";

export function AppMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // The auth screen renders its own full-bleed split-screen layout.
  if (pathname === "/login") {
    return <main>{children}</main>;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <WorkspaceStatusBanner />
      <VendorProfileNudge />
      {children}
    </main>
  );
}
