import { Suspense } from "react";
import { OpportunitiesWorkspace } from "@/components/opportunities/OpportunitiesWorkspace";
import { LoadingState } from "@/components/ui/LoadingState";

export default function OpportunitiesPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading opportunities..." />}>
      <OpportunitiesWorkspace />
    </Suspense>
  );
}
