import type { RealtimeChannel } from "@supabase/supabase-js";
import type { SavedQuote } from "@/lib/quotes/types";
import type { Workspace } from "@/lib/organizations/types";
import { getSupabaseClient, isSupabaseConfigured } from "./client";
import { rowToSavedQuote, type QuoteRow } from "./types";

export type QuotesRealtimeConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected";

export interface QuotesRealtimeHandlers {
  onInsert: (quote: SavedQuote) => void;
  onUpdate: (quote: SavedQuote) => void;
  onDelete: (id: string) => void;
  onStatusChange?: (status: QuotesRealtimeConnectionStatus) => void;
  /** Called when the channel (re)connects after the initial subscription. */
  onResync?: () => void;
}

let activeChannel: RealtimeChannel | null = null;
let activeWorkspaceKey: string | null = null;
let hasSubscribedOnce = false;

function workspaceChannelKey(workspace: Workspace, userId: string): string {
  return workspace.type === "personal"
    ? `personal:${userId}`
    : `org:${workspace.organizationId}`;
}

function workspaceRealtimeFilter(workspace: Workspace, userId: string): string {
  if (workspace.type === "organization") {
    return `organization_id=eq.${workspace.organizationId}`;
  }
  return `user_id=eq.${userId}`;
}

function shouldAcceptPersonalQuote(quote: SavedQuote): boolean {
  return !quote.organizationId;
}

export function subscribeToQuotesRealtime(
  userId: string,
  workspace: Workspace,
  handlers: QuotesRealtimeHandlers
): () => void {
  if (!isSupabaseConfigured()) {
    return () => undefined;
  }

  stopQuotesRealtimeSubscription();

  const supabase = getSupabaseClient();
  const channelKey = workspaceChannelKey(workspace, userId);
  activeWorkspaceKey = channelKey;
  hasSubscribedOnce = false;
  handlers.onStatusChange?.("connecting");

  const filter = workspaceRealtimeFilter(workspace, userId);
  const isPersonal = workspace.type === "personal";

  const handleInsert = (row: QuoteRow) => {
    const quote = rowToSavedQuote(row);
    if (isPersonal && !shouldAcceptPersonalQuote(quote)) return;
    handlers.onInsert(quote);
  };

  const handleUpdate = (row: QuoteRow) => {
    const quote = rowToSavedQuote(row);
    if (isPersonal && !shouldAcceptPersonalQuote(quote)) return;
    handlers.onUpdate(quote);
  };

  activeChannel = supabase
    .channel(`quotes:${channelKey}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "quotes",
        filter,
      },
      (payload) => {
        handleInsert(payload.new as QuoteRow);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "quotes",
        filter,
      },
      (payload) => {
        handleUpdate(payload.new as QuoteRow);
      }
    )
    .on(
      "postgres_changes",
      {
        event: "DELETE",
        schema: "public",
        table: "quotes",
        filter,
      },
      (payload) => {
        const row = payload.old as { id?: string };
        if (row?.id) handlers.onDelete(row.id);
      }
    )
    .subscribe((status) => {
      if (status === "SUBSCRIBED") {
        handlers.onStatusChange?.("connected");
        if (hasSubscribedOnce) {
          handlers.onResync?.();
        }
        hasSubscribedOnce = true;
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        handlers.onStatusChange?.("disconnected");
      }
    });

  return stopQuotesRealtimeSubscription;
}

export function stopQuotesRealtimeSubscription(): void {
  if (!activeChannel) return;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseClient();
    void supabase.removeChannel(activeChannel);
  }

  activeChannel = null;
  activeWorkspaceKey = null;
  hasSubscribedOnce = false;
}

export function getActiveQuotesRealtimeWorkspaceKey(): string | null {
  return activeWorkspaceKey;
}