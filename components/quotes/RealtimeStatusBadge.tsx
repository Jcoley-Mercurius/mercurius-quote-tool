"use client";

import { useSyncExternalStore } from "react";
import {
  getQuoteRealtimeStatus,
  subscribeQuoteRealtimeStatus,
} from "@/lib/quotes/store";

export function RealtimeStatusBadge() {
  const status = useSyncExternalStore(
    subscribeQuoteRealtimeStatus,
    getQuoteRealtimeStatus,
    () => "idle" as const
  );

  if (status === "idle") return null;

  if (status === "connected") {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-emerald-100"
        title="Live updates are active"
      >
        <span className="relative flex h-2 w-2" aria-hidden>
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        Live
      </span>
    );
  }

  if (status === "connecting") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200">
        <span className="h-2 w-2 animate-pulse rounded-full bg-slate-400" aria-hidden />
        Connecting…
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 ring-1 ring-amber-200"
      title="Live updates paused — your list may be stale until reconnected"
    >
      <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
      Offline
    </span>
  );
}