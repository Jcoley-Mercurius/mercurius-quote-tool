"use client";

import { WorkspaceStatusBanner } from "@/components/organizations/WorkspaceStatusBanner";
import { VendorProfileNudge } from "@/components/vendor/VendorProfileNudge";

export function AppMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <WorkspaceStatusBanner />
      <VendorProfileNudge />
      {children}
    </main>
  );
}
