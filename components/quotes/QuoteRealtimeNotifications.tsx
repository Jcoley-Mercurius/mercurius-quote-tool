"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { subscribeRemoteQuoteUpdates } from "@/lib/quotes/store";
import { toastInfo } from "@/lib/ui/toast";

function QuoteRealtimeNotificationsInner() {
  const { user } = useAuth();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeQuoteId =
    pathname === "/" ? searchParams.get("quoteId") : null;

  useEffect(() => {
    if (!user) return;

    return subscribeRemoteQuoteUpdates((event) => {
      if (pathname === "/quotes") {
        switch (event.type) {
          case "insert":
            toastInfo("New quote added to your history.", { duration: 2500 });
            break;
          case "update":
            toastInfo("A quote was updated.", { duration: 2500 });
            break;
          case "delete":
            toastInfo("A quote was removed.", { duration: 2500 });
            break;
        }
        return;
      }

      if (!activeQuoteId) return;

      if (event.type === "update" && event.quote.id === activeQuoteId) {
        toastInfo("This quote was updated in another session.", {
          duration: 3000,
        });
        return;
      }

      if (event.type === "delete" && event.id === activeQuoteId) {
        toastInfo("This quote was deleted in another session.", {
          duration: 3000,
        });
      }
    });
  }, [user, pathname, activeQuoteId]);

  return null;
}

export function QuoteRealtimeNotifications() {
  return (
    <Suspense fallback={null}>
      <QuoteRealtimeNotificationsInner />
    </Suspense>
  );
}