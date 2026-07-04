import {
  fetchVendorProfileForWorkspace,
  migrateLocalDataToSupabase,
  upsertVendorProfileRow,
} from "@/lib/supabase/migrate-local";
import type { Workspace } from "@/lib/organizations/types";
import { workspaceKey } from "@/lib/organizations/types";
import { DEFAULT_VENDOR_PROFILE } from "./defaults";
import type { VendorProfile } from "./types";

const listeners = new Set<() => void>();

let cachedProfile: VendorProfile = DEFAULT_VENDOR_PROFILE;
let activeUserId: string | null = null;
let activeWorkspace: Workspace = { type: "personal" };
let isHydrated = false;
let hydratePromise: Promise<void> | null = null;

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeVendorProfile(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getVendorProfileSnapshot(): VendorProfile {
  return cachedProfile;
}

export function getVendorProfileServerSnapshot(): VendorProfile {
  return DEFAULT_VENDOR_PROFILE;
}

export function getVendorProfileIsHydrated(): boolean {
  return isHydrated;
}

export function getActiveVendorWorkspace(): Workspace {
  return activeWorkspace;
}

export async function hydrateVendorStore(
  userId: string,
  workspace: Workspace,
  options?: { force?: boolean }
): Promise<void> {
  const scopeKey = workspaceKey(workspace);

  if (
    hydratePromise &&
    activeUserId === userId &&
    workspaceKey(activeWorkspace) === scopeKey &&
    !options?.force
  ) {
    return hydratePromise;
  }

  if (options?.force && hydratePromise) {
    try {
      await hydratePromise;
    } catch {
      // Continue with a fresh hydration attempt.
    }
  }

  activeUserId = userId;
  activeWorkspace = workspace;
  isHydrated = false;
  notify();

  hydratePromise = (async () => {
    try {
      if (workspace.type === "personal") {
        await migrateLocalDataToSupabase(userId);
      }

      const profile = await fetchVendorProfileForWorkspace(userId, workspace);
      cachedProfile = profile ?? DEFAULT_VENDOR_PROFILE;
    } finally {
      isHydrated = true;
      notify();
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export function clearVendorStore(): void {
  activeUserId = null;
  activeWorkspace = { type: "personal" };
  cachedProfile = DEFAULT_VENDOR_PROFILE;
  isHydrated = false;
  hydratePromise = null;
  notify();
}

export async function persistVendorProfile(
  profile: VendorProfile
): Promise<VendorProfile> {
  if (!activeUserId) {
    throw new Error("Cannot save vendor profile without an authenticated user");
  }

  cachedProfile = profile;
  notify();

  try {
    const saved = await upsertVendorProfileRow(
      activeUserId,
      profile,
      activeWorkspace
    );
    cachedProfile = saved;
    notify();
    return saved;
  } catch (error) {
    const remote = await fetchVendorProfileForWorkspace(
      activeUserId,
      activeWorkspace
    );
    cachedProfile = remote ?? DEFAULT_VENDOR_PROFILE;
    notify();
    throw error;
  }
}

export function writeVendorProfile(profile: VendorProfile): void {
  void persistVendorProfile(profile);
}