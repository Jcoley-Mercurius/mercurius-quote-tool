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

  const loadQuote = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/quotes/share/${encodeURIComponent(token)}`);
      const payload = (await response.json().catch(() => null)) as {
        quote?: PublicQuotePayload;
        error?: string;
      } | null;

      if (!response.ok || !payload?.quote) {
        setError(
          payload?.error ?? "This quote link is invalid or no longer available."
        );
        setData(null);
        return;
      }

      setData(payload.quote);
    } catch {
      setError("Could not load quote. Check your connection and try again.");
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadQuote();
  }, [token]);

  if (isLoading) {
    return <LoadingState message="Loading your quote..." />;
  }

  if (error || !data) {
    return (
      <ErrorFallback
        title="Quote unavailable"
        message={error ?? "This quote link is invalid or no longer available."}
        onRetry={() => void loadQuote()}
        showHomeLink={false}
      />
    );
  }

  return <ClientQuoteView data={data} token={token} />;
}
