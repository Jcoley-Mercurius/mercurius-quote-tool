"use client";

import { WorkspaceStatusBanner } from "@/components/organizations/WorkspaceStatusBanner";

export function AppMain({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <WorkspaceStatusBanner />
      {children}
    </main>
  );
}