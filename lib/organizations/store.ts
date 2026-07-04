import { createOrganization, fetchUserOrganizations } from "./api";
import {
  isMissingOrganizationsSchema,
  organizationsErrorMessage,
} from "./errors";
import {
  loadActiveWorkspaceKey,
  saveActiveWorkspaceKey,
} from "./storage";
import {
  parseStoredWorkspace,
  workspaceKey,
  type OrganizationMembership,
  type Workspace,
} from "./types";

const listeners = new Set<() => void>();

let memberships: OrganizationMembership[] = [];
let workspace: Workspace = { type: "personal" };
let activeUserId: string | null = null;
let isHydrated = false;
let hydratePromise: Promise<void> | null = null;
let organizationsSchemaAvailable = true;
let schemaWarningLogged = false;
let hydrateError: string | null = null;

function notify(): void {
  listeners.forEach((listener) => listener());
}

export function subscribeWorkspace(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getWorkspaceSnapshot(): Workspace {
  return workspace;
}

export function getWorkspaceMembershipsSnapshot(): OrganizationMembership[] {
  return memberships;
}

export function getWorkspaceIsHydrated(): boolean {
  return isHydrated;
}

export function getWorkspaceActiveUserId(): string | null {
  return activeUserId;
}

export function getOrganizationsSchemaAvailable(): boolean {
  return organizationsSchemaAvailable;
}

export function getWorkspaceHydrateErrorSnapshot(): string | null {
  return hydrateError;
}

function logSchemaWarningOnce(error: unknown): void {
  if (schemaWarningLogged) return;
  schemaWarningLogged = true;
  console.warn(
    organizationsErrorMessage(
      error,
      "Organization tables are not available. Team features are disabled until Supabase migrations are applied."
    )
  );
}

export async function hydrateWorkspaceStore(
  userId: string,
  options?: { force?: boolean }
): Promise<void> {
  if (hydratePromise && activeUserId === userId && !options?.force) {
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
  isHydrated = false;
  hydrateError = null;
  notify();

  hydratePromise = (async () => {
    try {
      const nextMemberships = await fetchUserOrganizations(userId);
      memberships = nextMemberships;
      organizationsSchemaAvailable = true;
      hydrateError = null;

      const storedKey = loadActiveWorkspaceKey();
      workspace = parseStoredWorkspace(storedKey, nextMemberships);
      saveActiveWorkspaceKey(workspaceKey(workspace));
    } catch (error) {
      if (isMissingOrganizationsSchema(error)) {
        organizationsSchemaAvailable = false;
        memberships = [];
        workspace = { type: "personal" };
        hydrateError = null;
        logSchemaWarningOnce(error);
      } else {
        hydrateError = organizationsErrorMessage(
          error,
          "Could not load team workspaces. Personal workspace is still available."
        );
        memberships = [];
        workspace = { type: "personal" };
      }
    } finally {
      isHydrated = true;
      notify();
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export function clearWorkspaceStore(): void {
  activeUserId = null;
  memberships = [];
  workspace = { type: "personal" };
  isHydrated = false;
  hydratePromise = null;
  organizationsSchemaAvailable = true;
  schemaWarningLogged = false;
  hydrateError = null;
  notify();
}

export function setActiveWorkspace(next: Workspace): void {
  workspace = next;
  saveActiveWorkspaceKey(workspaceKey(next));
  notify();
}

export async function createOrganizationAndActivate(
  name: string
): Promise<Workspace> {
  if (!activeUserId) {
    throw new Error("Must be signed in to create an organization");
  }

  if (!organizationsSchemaAvailable) {
    throw new Error(
      "Team workspaces are not set up in Supabase yet. Run migrations 003_organizations.sql and 004_organization_invites.sql in the SQL Editor."
    );
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error("Organization name is required");
  }

  const organizationId = await createOrganization(trimmedName);
  await hydrateWorkspaceStore(activeUserId, { force: true });

  const created = memberships.find(
    (membership) => membership.organizationId === organizationId
  );

  const nextWorkspace: Workspace = created
    ? {
        type: "organization",
        organizationId: created.organizationId,
        name: created.organizationName,
      }
    : {
        type: "organization",
        organizationId,
        name: trimmedName,
      };

  setActiveWorkspace(nextWorkspace);
  return nextWorkspace;
}

export async function refreshWorkspaceStore(): Promise<void> {
  if (!activeUserId) return;
  await hydrateWorkspaceStore(activeUserId, { force: true });
}