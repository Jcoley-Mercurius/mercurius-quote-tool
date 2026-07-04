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
import { useWorkspace } from "@/components/organizations/WorkspaceProvider";
import { useVendorProfile } from "@/components/vendor/VendorProfileProvider";
import type { Workspace } from "@/lib/organizations/types";
import { QuoteRealtimeNotifications } from "./QuoteRealtimeNotifications";
import { createSavedQuote, deriveJobName } from "@/lib/quotes/helpers";
import { captureVendorSnapshot } from "@/lib/quotes/vendor-snapshot";
import type { VendorProfile } from "@/lib/vendor/types";
import {
  clearQuoteStore,
  getQuoteById,
  getQuoteHydrateErrorSnapshot,
  getQuoteHistoryIsHydrated,
  getQuoteHistorySnapshot,
  hydrateQuoteStore,
  persistQuote,
  removeQuote,
  subscribeQuoteHistory,
} from "@/lib/quotes/store";
import type { GeneratedQuote, QuoteFormPayload } from "@/lib/quote/types";
import type { QuoteStatus, SavedQuote } from "@/lib/quotes/types";

/** Stable empty snapshot for SSR/hydration — must never be a fresh `[]` per call. */
const SERVER_QUOTES_SNAPSHOT: SavedQuote[] = [];

function getServerQuotesSnapshot(): SavedQuote[] {
  return SERVER_QUOTES_SNAPSHOT;
}

interface QuoteHistoryContextValue {
  quotes: SavedQuote[];
  isLoading: boolean;
  loadError: string | null;
  isRetrying: boolean;
  retryQuotes: () => Promise<void>;
  saveQuote: (quote: SavedQuote) => Promise<SavedQuote>;
  createAndSave: (
    form: QuoteFormPayload,
    quote: GeneratedQuote,
    source: "ai" | "fallback",
    saveTarget?: Workspace,
    vendorProfile?: VendorProfile
  ) => Promise<SavedQuote>;
  updateQuote: (
    id: string,
    updates: {
      quote?: GeneratedQuote;
      form?: QuoteFormPayload;
      status?: QuoteStatus;
      vendorProfile?: VendorProfile;
    }
  ) => Promise<void>;
  deleteQuote: (id: string) => Promise<void>;
  getQuote: (id: string) => SavedQuote | undefined;
}

const QuoteHistoryContext = createContext<QuoteHistoryContextValue | null>(null);

export function QuoteHistoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: authLoading } = useAuth();
  const { workspace, isLoading: workspaceLoading } = useWorkspace();
  const { profile: liveVendorProfile } = useVendorProfile();
  const [isRetrying, setIsRetrying] = useState(false);

  const quotes = useSyncExternalStore(
    subscribeQuoteHistory,
    getQuoteHistorySnapshot,
    getServerQuotesSnapshot
  );

  const isHydrated = useSyncExternalStore(
    subscribeQuoteHistory,
    getQuoteHistoryIsHydrated,
    () => false
  );

  const loadError = useSyncExternalStore(
    subscribeQuoteHistory,
    getQuoteHydrateErrorSnapshot,
    () => null
  );

  useEffect(() => {
    if (authLoading || workspaceLoading) return;

    if (!user) {
      clearQuoteStore();
      return;
    }

    void hydrateQuoteStore(user.id, workspace);
  }, [user, authLoading, workspace, workspaceLoading]);

  const isLoading =
    authLoading || workspaceLoading || Boolean(user && !isHydrated);

  const saveQuote = useCallback(async (quote: SavedQuote) => {
    return persistQuote(quote);
  }, []);

  const createAndSave = useCallback(
    async (
      form: QuoteFormPayload,
      quote: GeneratedQuote,
      source: "ai" | "fallback",
      saveTarget?: Workspace,
      vendorProfile?: VendorProfile
    ): Promise<SavedQuote> => {
      const target = saveTarget ?? workspace;
      const saved = createSavedQuote(form, quote, source);
      saved.organizationId =
        target.type === "organization" ? target.organizationId : null;
      saved.vendorSnapshot = captureVendorSnapshot(
        vendorProfile ?? liveVendorProfile
      );
      return persistQuote(saved);
    },
    [liveVendorProfile, workspace]
  );

  const updateQuote = useCallback(
    async (
      id: string,
      updates: {
        quote?: GeneratedQuote;
        form?: QuoteFormPayload;
        status?: QuoteStatus;
        vendorProfile?: VendorProfile;
      }
    ) => {
      const existing = getQuoteById(id);
      if (!existing) return;

      const form = updates.form ?? existing.form;
      const quote = updates.quote ?? existing.quote;
      const { vendorProfile, ...rest } = updates;

      await persistQuote({
        ...existing,
        ...rest,
        form,
        quote,
        vendorSnapshot: vendorProfile
          ? captureVendorSnapshot(vendorProfile)
          : existing.vendorSnapshot,
        jobName: deriveJobName(form, quote),
        updatedAt: new Date().toISOString(),
      });
    },
    []
  );

  const deleteQuote = useCallback(async (id: string) => {
    await removeQuote(id);
  }, []);

  const getQuote = useCallback((id: string) => getQuoteById(id), []);

  const retryQuotes = useCallback(async () => {
    if (!user) return;
    setIsRetrying(true);
    try {
      await hydrateQuoteStore(user.id, workspace, { force: true });
    } finally {
      setIsRetrying(false);
    }
  }, [user, workspace]);

  const value = useMemo(
    () => ({
      quotes,
      isLoading,
      loadError,
      isRetrying,
      retryQuotes,
      saveQuote,
      createAndSave,
      updateQuote,
      deleteQuote,
      getQuote,
    }),
    [
      quotes,
      isLoading,
      loadError,
      isRetrying,
      retryQuotes,
      saveQuote,
      createAndSave,
      updateQuote,
      deleteQuote,
      getQuote,
    ]
  );

  return (
    <QuoteHistoryContext.Provider value={value}>
      <QuoteRealtimeNotifications />
      {children}
    </QuoteHistoryContext.Provider>
  );
}

export function useQuoteHistory() {
  const ctx = useContext(QuoteHistoryContext);
  if (!ctx) {
    throw new Error("useQuoteHistory must be used within QuoteHistoryProvider");
  }
  return ctx;
}