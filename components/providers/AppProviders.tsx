"use client";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { WelcomeToast } from "@/components/auth/WelcomeToast";
import { AppToaster } from "@/components/ui/AppToaster";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { WorkspaceProvider } from "@/components/organizations/WorkspaceProvider";
import { QuoteHistoryProvider } from "@/components/quotes/QuoteHistoryProvider";
import { VendorProfileProvider } from "@/components/vendor/VendorProfileProvider";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppToaster />
      <ErrorBoundary>
        <RequireAuth>
          <WelcomeToast />
          <WorkspaceProvider>
            <VendorProfileProvider>
              <QuoteHistoryProvider>
                {/* Onboarding wizard sits here so it has access to auth,
                    workspace, and vendor profile — renders as a modal overlay
                    only when the profile is incomplete */}
                <OnboardingWizard />
                {children}
              </QuoteHistoryProvider>
            </VendorProfileProvider>
          </WorkspaceProvider>
        </RequireAuth>
      </ErrorBoundary>
    </AuthProvider>
  );
}
