"use client";

import { useEffect } from "react";
import { ErrorFallback } from "@/components/ui/ErrorFallback";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <ErrorFallback
      title="This page ran into a problem"
      message="Something went wrong while loading this page. You can try again or return home."
      onRetry={reset}
    />
  );
}