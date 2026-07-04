"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  clearWorkspaceStore,
  createOrganizationAndActivate,
  getOrganizationsSchemaAvailable,
  getWorkspaceHydrateErrorSnapshot,
  getWorkspaceIsHydrated,
  getWorkspaceMembershipsSnapshot,
  getWorkspaceSnapshot,
  hydrateWorkspaceStore,
  refreshWorkspaceStore,
  setActiveWorkspace,
  subscribeWorkspace,
} from "@/lib/organizations/store";
import type { OrganizationMembership, Workspace } from "@/lib/organizations/types";
interface WorkspaceContextValue {
  workspace: Workspace;
  memberships: OrganizationMembership[];
  isLoading: boolean;
  loadError: string | null;
  isRetrying: boolean;
  schemaAvailable: boolean;
  switchWorkspace: (workspace: Workspace) => void;
  createNewOrganization: (name: string) => Promise<Workspace>;
  refreshOrganizations: () => Promise<void>;
  retryOrganizations: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

const SERVER_WORKSPACE: Workspace = { type: "personal" };
const SERVER_MEMBERSHIPS: OrganizationMembership[] = [];

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: authLoading } = useAuth();
  const [isRetrying, setIsRetrying] = useState(false);

  const workspace = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceSnapshot,
    () => SERVER_WORKSPACE
  );

  const memberships = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceMembershipsSnapshot,
    () => SERVER_MEMBERSHIPS
  );

  const isHydrated = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceIsHydrated,
    () => false
  );

  const loadError = useSyncExternalStore(
    subscribeWorkspace,
    getWorkspaceHydrateErrorSnapshot,
    () => null
  );

  const schemaAvailable = useSyncExternalStore(
    subscribeWorkspace,
    getOrganizationsSchemaAvailable,
    () => true
  );

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      clearWorkspaceStore();
      return;
    }

    void hydrateWorkspaceStore(user.id);
  }, [authLoading, user]);

  const isLoading = authLoading || Boolean(user && !isHydrated);

  const switchWorkspace = useCallback((next: Workspace) => {
    setActiveWorkspace(next);
  }, []);

  const createNewOrganization = useCallback(async (name: string) => {
    return createOrganizationAndActivate(name);
  }, []);

  const refreshOrganizations = useCallback(async () => {
    await refreshWorkspaceStore();
  }, []);

  const retryOrganizations = useCallback(async () => {
    if (!user) return;
    setIsRetrying(true);
    try {
      await hydrateWorkspaceStore(user.id, { force: true });
    } finally {
      setIsRetrying(false);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      workspace,
      memberships,
      isLoading,
      loadError,
      isRetrying,
      schemaAvailable,
      switchWorkspace,
      createNewOrganization,
      refreshOrganizations,
      retryOrganizations,
    }),
    [
      workspace,
      memberships,
      isLoading,
      loadError,
      isRetrying,
      schemaAvailable,
      switchWorkspace,
      createNewOrganization,
      refreshOrganizations,
      retryOrganizations,
    ]
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
}

export function useWorkspaceLabel(): string {
  const { workspace } = useWorkspace();
  return workspace.type === "personal" ? "Personal" : workspace.name;
}