"use client";

import { useEffect, useState } from "react";
import { ErrorFallback } from "@/components/ui/ErrorFallback";
import { LoadingState } from "@/components/ui/LoadingState";
import type { PublicQuotePayload } from "@/lib/quotes/public-quote";
import { ClientQuoteView } from "./ClientQuoteView";

interface ClientQuoteFlowProps {
  token: string;
}

export function ClientQuoteFlow({ token }: ClientQuoteFlowProps) {
  const [data, setData] = useState<PublicQuotePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Exposed so ErrorFallback's retry button can trigger a reload.
  // Defined here (not inside the effect) so we can pass it as a prop.
  const [reloadKey, setReloadKey] = useState(0);
  const retry = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let active = true;

    fetch(`/api/quotes/share/${encodeURIComponent(token)}`)
      .then((r) => r.json().catch(() => null))
      .then(
        (
          payload: {
            quote?: PublicQuotePayload;
            error?: string;
          } | null
        ) => {
          if (!active) return;
          if (!payload?.quote) {
            setError(
              payload?.error ??
                "This quote link is invalid or no longer available."
            );
            setData(null);
          } else {
            setData(payload.quote);
            setError(null);
          }
          setIsLoading(false);
        }
      )
      .catch(() => {
        if (!active) return;
        setError("Could not load quote. Check your connection and try again.");
        setData(null);
        setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [token, reloadKey]);

  if (isLoading) {
    return <LoadingState message="Loading your quote..." />;
  }

  if (error || !data) {
    return (
      <ErrorFallback
        title="Quote unavailable"
        message={error ?? "This quote link is invalid or no longer available."}
        onRetry={retry}
        showHomeLink={false}
      />
    );
  }

  return <ClientQuoteView data={data} token={token} />;
}
