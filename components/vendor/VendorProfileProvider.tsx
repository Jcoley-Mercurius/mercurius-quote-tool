"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useWorkspace } from "@/components/organizations/WorkspaceProvider";
import type { Workspace } from "@/lib/organizations/types";
import { workspaceLabel } from "@/lib/organizations/types";
import { DEFAULT_VENDOR_PROFILE } from "@/lib/vendor/defaults";
import {
  clearVendorStore,
  getActiveVendorWorkspace,
  getVendorProfileIsHydrated,
  getVendorProfileServerSnapshot,
  getVendorProfileSnapshot,
  hydrateVendorStore,
  persistVendorProfile,
  subscribeVendorProfile,
} from "@/lib/vendor/store";
import { toPricingSettings, type VendorProfile } from "@/lib/vendor/types";

interface VendorProfileContextValue {
  profile: VendorProfile;
  pricingSettings: ReturnType<typeof toPricingSettings>;
  workspaceScope: Workspace;
  workspaceLabel: string;
  isOrganizationProfile: boolean;
  isLoading: boolean;
  updateProfile: (updates: Partial<VendorProfile>) => void;
  setProfile: (profile: VendorProfile) => void;
  saveProfile: (profile: VendorProfile) => Promise<void>;
  resetProfile: () => Promise<void>;
}

const VendorProfileContext = createContext<VendorProfileContextValue | null>(
  null
);

export function VendorProfileProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const { workspace, isLoading: workspaceLoading } = useWorkspace();

  const profile = useSyncExternalStore(
    subscribeVendorProfile,
    getVendorProfileSnapshot,
    getVendorProfileServerSnapshot
  );

  const workspaceScope = useSyncExternalStore(
    subscribeVendorProfile,
    getActiveVendorWorkspace,
    () => ({ type: "personal" } as Workspace)
  );

  const isHydrated = useSyncExternalStore(
    subscribeVendorProfile,
    getVendorProfileIsHydrated,
    () => false
  );

  useEffect(() => {
    if (authLoading || workspaceLoading) return;

    if (!user) {
      clearVendorStore();
      return;
    }

    void hydrateVendorStore(user.id, workspace);
  }, [user, authLoading, workspace, workspaceLoading]);

  const isLoading =
    authLoading || workspaceLoading || Boolean(user && !isHydrated);

  const setProfile = useCallback((next: VendorProfile) => {
    void persistVendorProfile(next);
  }, []);

  const saveProfile = useCallback(async (next: VendorProfile) => {
    await persistVendorProfile(next);
  }, []);

  const updateProfile = useCallback(
    (updates: Partial<VendorProfile>) => {
      void persistVendorProfile({ ...profile, ...updates });
    },
    [profile]
  );

  const resetProfile = useCallback(async () => {
    await persistVendorProfile(DEFAULT_VENDOR_PROFILE);
  }, []);

  const value = useMemo(
    () => ({
      profile,
      pricingSettings: toPricingSettings(profile),
      workspaceScope,
      workspaceLabel: workspaceLabel(workspaceScope),
      isOrganizationProfile: workspaceScope.type === "organization",
      isLoading,
      updateProfile,
      setProfile,
      saveProfile,
      resetProfile,
    }),
    [
      profile,
      workspaceScope,
      isLoading,
      updateProfile,
      setProfile,
      saveProfile,
      resetProfile,
    ]
  );

  return (
    <VendorProfileContext.Provider value={value}>
      {children}
    </VendorProfileContext.Provider>
  );
}

export function useVendorProfile() {
  const ctx = useContext(VendorProfileContext);
  if (!ctx) {
    throw new Error("useVendorProfile must be used within VendorProfileProvider");
  }
  return ctx;
}