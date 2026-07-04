"use client";

import { JobPhotosGallery } from "@/components/photos/JobPhotosGallery";
import { useQuoteHistory } from "@/components/quotes/QuoteHistoryProvider";
import { useWorkspace } from "./WorkspaceProvider";

export function OrganizationJobPhotosSettings() {
  const { workspace } = useWorkspace();
  const { quotes, isLoading } = useQuoteHistory();

  if (workspace.type !== "organization") {
    return null;
  }

  return (
    <JobPhotosGallery
      quotes={quotes}
      isLoading={isLoading}
      title="Job Photos"
      description="Browse photos uploaded across organization quotes. Click a thumbnail to view the full image and open the related quote."
      emptyTitle="No job photos yet"
      emptyDescription="Photos appear here when quotes in this organization include uploaded images."
      countLabel="across organization quotes"
    />
  );
}