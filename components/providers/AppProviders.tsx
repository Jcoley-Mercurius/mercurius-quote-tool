"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { WelcomeToast } from "@/components/auth/WelcomeToast";
import { AppToaster } from "@/components/ui/AppToaster";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { WorkspaceProvider } from "@/components/organizations/WorkspaceProvider";
import { QuoteHistoryProvider } from "@/components/quotes/QuoteHistoryProvider";
import { VendorProfileProvider } from "@/components/vendor/VendorProfileProvider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppToaster />
      <ErrorBoundary>
        <RequireAuth>
          <WelcomeToast />
          <WorkspaceProvider>
            <VendorProfileProvider>
              <QuoteHistoryProvider>{children}</QuoteHistoryProvider>
            </VendorProfileProvider>
          </WorkspaceProvider>
        </RequireAuth>
      </ErrorBoundary>
    </AuthProvider>
  );
}