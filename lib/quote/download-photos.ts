import { getSupabaseClient } from "@/lib/supabase/client";

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function safeZipFilename(quoteReference: string): string {
  const safeRef = quoteReference.replace(/[^a-zA-Z0-9-]+/g, "-");
  return `${safeRef}-photos.zip`;
}

export async function downloadQuotePhotosZip(
  quoteId: string,
  quoteReference: string
): Promise<void> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("You must be signed in to download photos.");
  }

  const response = await fetch(`/api/quotes/${quoteId}/photos/download`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string }).error ?? "Could not download photos."
    );
  }

  const blob = await response.blob();
  triggerDownload(blob, safeZipFilename(quoteReference));
}