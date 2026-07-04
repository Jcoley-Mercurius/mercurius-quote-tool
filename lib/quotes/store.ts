import {
  deleteQuoteRow,
  fetchQuotesForWorkspace,
  migrateLocalDataToSupabase,
  upsertQuoteRow,
} from "@/lib/supabase/migrate-local";
import { deleteQuotePhotos } from "@/lib/supabase/quote-photo-storage";
import {
  subscribeToQuotesRealtime,
  stopQuotesRealtimeSubscription,
  type QuotesRealtimeConnectionStatus,
} from "@/lib/supabase/quotes-realtime";
import { friendlyError } from "@/lib/errors/messages";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/organizations/types";
import { workspaceKey } from "@/lib/organizations/types";
import type { SavedQuote } from "./types";

const listeners = new Set<() => void>();
const statusListeners = new Set<() => void>();

let cachedQuotes: SavedQuote[] = [];
let activeUserId: string | null = null;
let activeWorkspace: Workspace = { type: "personal" };
let isHydrated = false;
let hydratePromise: Promise<void> | null = null;
let hydrateError: string | null = null;
let realtimeStatus: QuotesRealtimeConnectionStatus | "idle" = "idle";

const locallyMutatedQuoteIds = new Set<string>();
const localMutationTimers = new Map<string, ReturnType<typeof setTimeout>>();
const LOCAL_MUTATION_WINDOW_MS = 2500;

export type RemoteQuoteEvent =
  | { type: "insert"; quote: SavedQuote }
  | { type: "update"; quote: SavedQuote }
  | { type: "delete"; id: string };

type RemoteQuoteListener = (event: RemoteQuoteEvent) => void;
const remoteListeners = new Set<RemoteQuoteListener>();

function notify(): void {
  listeners.forEach((listener) => listener());
}

function notifyStatus(): void {
  statusListeners.forEach((listener) => listener());
}

function setRealtimeStatus(status: QuotesRealtimeConnectionStatus | "idle"): void {
  if (realtimeStatus === status) return;
  realtimeStatus = status;
  notifyStatus();
}

async function resyncQuotesFromServer(): Promise<void> {
  if (!activeUserId) return;

  try {
    cachedQuotes = await fetchQuotesForWorkspace(activeUserId, activeWorkspace);
    notify();
  } catch (error) {
    console.error("Failed to resync quotes after realtime reconnect:", error);
  }
}

function emitRemoteEvent(event: RemoteQuoteEvent): void {
  remoteListeners.forEach((listener) => listener(event));
}

function markLocalQuoteMutation(id: string): void {
  locallyMutatedQuoteIds.add(id);

  const existingTimer = localMutationTimers.get(id);
  if (existingTimer) clearTimeout(existingTimer);

  localMutationTimers.set(
    id,
    setTimeout(() => {
      locallyMutatedQuoteIds.delete(id);
      localMutationTimers.delete(id);
    }, LOCAL_MUTATION_WINDOW_MS)
  );
}

function clearLocalMutationTracking(): void {
  for (const timer of localMutationTimers.values()) {
    clearTimeout(timer);
  }
  localMutationTimers.clear();
  locallyMutatedQuoteIds.clear();
}

function sortQuotesByUpdatedAt(quotes: SavedQuote[]): void {
  quotes.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

function quoteBelongsToWorkspace(
  quote: SavedQuote,
  workspace: Workspace
): boolean {
  if (workspace.type === "personal") {
    return !quote.organizationId;
  }
  return quote.organizationId === workspace.organizationId;
}

function hasQuoteChanged(existing: SavedQuote, next: SavedQuote): boolean {
  return (
    existing.updatedAt !== next.updatedAt ||
    existing.status !== next.status ||
    existing.jobName !== next.jobName ||
    existing.reference !== next.reference
  );
}

function upsertInCache(quote: SavedQuote): boolean {
  const index = cachedQuotes.findIndex((q) => q.id === quote.id);

  if (index >= 0) {
    const existing = cachedQuotes[index];
    if (!hasQuoteChanged(existing, quote)) {
      return false;
    }
    cachedQuotes[index] = quote;
  } else {
    cachedQuotes.unshift(quote);
  }

  sortQuotesByUpdatedAt(cachedQuotes);
  return true;
}

function applyRemoteInsert(quote: SavedQuote): void {
  if (locallyMutatedQuoteIds.has(quote.id)) return;

  const existing = cachedQuotes.find((q) => q.id === quote.id);
  if (existing && existing.updatedAt >= quote.updatedAt) return;

  if (!upsertInCache(quote)) return;

  notify();
  emitRemoteEvent({ type: "insert", quote });
}

function applyRemoteUpdate(quote: SavedQuote): void {
  if (locallyMutatedQuoteIds.has(quote.id)) return;

  const existing = cachedQuotes.find((q) => q.id === quote.id);
  if (existing && existing.updatedAt >= quote.updatedAt) return;

  if (!upsertInCache(quote)) return;

  notify();
  emitRemoteEvent({ type: "update", quote });
}

function applyRemoteDelete(id: string): void {
  if (locallyMutatedQuoteIds.has(id)) return;
  if (!cachedQuotes.some((q) => q.id === id)) return;

  cachedQuotes = cachedQuotes.filter((q) => q.id !== id);
  notify();
  emitRemoteEvent({ type: "delete", id });
}

function startQuotesRealtime(userId: string, workspace: Workspace): void {
  if (!isSupabaseConfigured()) {
    setRealtimeStatus("idle");
    return;
  }

  subscribeToQuotesRealtime(userId, workspace, {
    onInsert: applyRemoteInsert,
    onUpdate: applyRemoteUpdate,
    onDelete: applyRemoteDelete,
    onStatusChange: setRealtimeStatus,
    onResync: () => {
      void resyncQuotesFromServer();
    },
  });
}

export function subscribeQuoteHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function subscribeQuoteRealtimeStatus(listener: () => void): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function getQuoteRealtimeStatus(): QuotesRealtimeConnectionStatus | "idle" {
  return realtimeStatus;
}

export function subscribeRemoteQuoteUpdates(
  listener: RemoteQuoteListener
): () => void {
  remoteListeners.add(listener);
  return () => remoteListeners.delete(listener);
}

export function getQuoteHistorySnapshot(): SavedQuote[] {
  return cachedQuotes;
}

export function getQuoteHistoryIsHydrated(): boolean {
  return isHydrated;
}

export function getQuoteHistoryActiveUserId(): string | null {
  return activeUserId;
}

export function getQuoteHistoryActiveWorkspace(): Workspace {
  return activeWorkspace;
}

export function getQuoteHydrateErrorSnapshot(): string | null {
  return hydrateError;
}

export async function hydrateQuoteStore(
  userId: string,
  workspace: Workspace = { type: "personal" },
  options?: { force?: boolean }
): Promise<void> {
  const nextWorkspaceKey = workspaceKey(workspace);
  const currentWorkspaceKey = workspaceKey(activeWorkspace);

  if (
    hydratePromise &&
    activeUserId === userId &&
    currentWorkspaceKey === nextWorkspaceKey &&
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

  stopQuotesRealtimeSubscription();
  setRealtimeStatus("idle");
  activeUserId = userId;
  activeWorkspace = workspace;
  isHydrated = false;
  hydrateError = null;
  notify();

  hydratePromise = (async () => {
    try {
      await migrateLocalDataToSupabase(userId);
      cachedQuotes = await fetchQuotesForWorkspace(userId, workspace);
      hydrateError = null;
      startQuotesRealtime(userId, workspace);
    } catch (error) {
      cachedQuotes = [];
      hydrateError = friendlyError(
        error,
        "Could not load quotes for this workspace. Try again in a moment."
      );
      setRealtimeStatus("idle");
    } finally {
      isHydrated = true;
      notify();
      hydratePromise = null;
    }
  })();

  return hydratePromise;
}

export function clearQuoteStore(): void {
  stopQuotesRealtimeSubscription();
  setRealtimeStatus("idle");
  clearLocalMutationTracking();
  activeUserId = null;
  activeWorkspace = { type: "personal" };
  cachedQuotes = [];
  isHydrated = false;
  hydratePromise = null;
  hydrateError = null;
  notify();
}

export async function persistQuote(quote: SavedQuote): Promise<SavedQuote> {
  if (!activeUserId) {
    throw new Error("Cannot save quote without an authenticated user");
  }

  const belongsToActive = quoteBelongsToWorkspace(quote, activeWorkspace);

  if (belongsToActive) {
    markLocalQuoteMutation(quote.id);
    upsertInCache(quote);
    notify();
  }

  try {
    const saved = await upsertQuoteRow(activeUserId, quote);
    if (belongsToActive) {
      markLocalQuoteMutation(saved.id);
      if (upsertInCache(saved)) {
        notify();
      }
    }
    return saved;
  } catch (error) {
    if (belongsToActive) {
      cachedQuotes = await fetchQuotesForWorkspace(activeUserId, activeWorkspace);
      notify();
    }
    throw error;
  }
}

export function upsertQuote(quote: SavedQuote): void {
  void persistQuote(quote);
}

export async function removeQuote(id: string): Promise<void> {
  if (!activeUserId) return;

  const quoteToDelete = cachedQuotes.find((q) => q.id === id);

  markLocalQuoteMutation(id);
  const previous = cachedQuotes;
  cachedQuotes = cachedQuotes.filter((q) => q.id !== id);
  notify();

  try {
    await deleteQuoteRow(id);

    if (quoteToDelete) {
      try {
        await deleteQuotePhotos(
          activeUserId,
          id,
          quoteToDelete.organizationId
        );
      } catch (photoError) {
        console.error("Failed to delete quote photos:", photoError);
      }
    }
  } catch (error) {
    cachedQuotes = previous;
    notify();
    throw error;
  }
}

export function getQuoteById(id: string): SavedQuote | undefined {
  return cachedQuotes.find((q) => q.id === id);
}