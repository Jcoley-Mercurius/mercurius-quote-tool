"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { toastError, toastInfo, toastSuccess } from "@/lib/ui/toast";
import type { QuoteStatus } from "@/lib/quotes/types";

interface ShareQuoteButtonProps {
  quoteId: string;
  status: QuoteStatus;
  onStatusChange?: (status: QuoteStatus) => void;
}

export function ShareQuoteButton({
  quoteId,
  status,
  onStatusChange,
}: ShareQuoteButtonProps) {
  const { session } = useAuth();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    const accessToken = session?.access_token;
    if (!accessToken) {
      toastError(null, "Sign in to share quotes with clients.");
      return;
    }

    if (status === "draft") {
      toastInfo(
        "Sharing will mark this quote as Sent and generate a client link.",
        { duration: 4000 }
      );
    }

    setIsSharing(true);
    try {
      const response = await fetch(`/api/quotes/${quoteId}/share`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const payload = (await response.json().catch(() => null)) as {
        shareUrl?: string;
        statusUpdated?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.shareUrl) {
        toastError(
          new Error(payload?.error ?? "Share failed"),
          "Could not create client link. Please try again."
        );
        return;
      }

      await navigator.clipboard.writeText(payload.shareUrl);

      if (payload.statusUpdated === "sent" && status === "draft") {
        onStatusChange?.("sent");
      }

      toastSuccess("Client link copied to clipboard.");
    } catch {
      toastError(null, "Could not copy link. Please try again.");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      disabled={isSharing}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-mercurius-200 bg-mercurius-50 px-4 py-2 text-sm font-medium text-mercurius-700 transition-colors hover:bg-mercurius-100 focus:outline-none focus:ring-2 focus:ring-mercurius-500/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isSharing ? (
        <>
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Creating link...
        </>
      ) : (
        <>
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M12.232 4.879a2.25 2.25 0 0 1 3.182 3.182l-4.5 4.5a2.25 2.25 0 0 1-3.182-3.182l1.06-1.06a.75.75 0 0 0-1.061-1.06l-1.06 1.06a3.75 3.75 0 1 1 5.303 5.303l4.5-4.5a3.75 3.75 0 0 0-5.303-5.303l-1.06 1.06a.75.75 0 1 0 1.06 1.061l1.06-1.06z" />
            <path d="M7.768 15.121a2.25 2.25 0 0 1-3.182-3.182l4.5-4.5a2.25 2.25 0 0 1 3.182 3.182l-1.06 1.06a.75.75 0 1 0 1.061 1.06l1.06-1.06a3.75 3.75 0 0 0-5.303-5.303l-4.5 4.5a3.75 3.75 0 0 0 5.303 5.303l1.06-1.06a.75.75 0 0 0-1.06-1.061l-1.06 1.06z" />
          </svg>
          Copy client link
        </>
      )}
    </button>
  );
}