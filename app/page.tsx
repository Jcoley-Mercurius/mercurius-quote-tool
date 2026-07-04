import { Suspense } from "react";
import { QuoteFlow } from "@/components/quote-flow/QuoteFlow";
import { LoadingState } from "@/components/ui/LoadingState";

export default function Home() {
  return (
    <Suspense fallback={<LoadingState message="Loading quote builder..." />}>
      <QuoteFlow />
    </Suspense>
  );
}