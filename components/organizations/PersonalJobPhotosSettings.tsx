"use client";

import { JobPhotosGallery } from "@/components/photos/JobPhotosGallery";
import { useQuoteHistory } from "@/components/quotes/QuoteHistoryProvider";
import { useWorkspace } from "./WorkspaceProvider";

export function PersonalJobPhotosSettings() {
  const { workspace } = useWorkspace();
  const { quotes, isLoading } = useQuoteHistory();

  if (workspace.type !== "personal") {
    return null;
  }

  return (
    <JobPhotosGallery
      quotes={quotes}
      isLoading={isLoading}
      title="My Photos"
      description="Browse photos uploaded across your personal quotes. Click a thumbnail to view the full image and open the related quote."
      emptyTitle="No photos yet"
      emptyDescription="Photos appear here when your quotes include uploaded images."
      countLabel="across your quotes"
    />
  );
}