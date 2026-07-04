import JSZip from "jszip";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  QUOTE_PHOTO_ORIGINALS_BUCKET,
  QUOTE_PHOTOS_BUCKET,
} from "@/lib/supabase/quote-photo-storage";
import type { QuotePhotoThumbnail } from "./types";

function extensionFromPath(path: string): string {
  const match = path.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? "jpg";
}

function extensionFromName(name: string | undefined): string | null {
  if (!name) return null;
  const match = name.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function zipEntryName(photo: QuotePhotoThumbnail): string {
  const fromName = extensionFromName(photo.originalName);
  const fromPath = photo.originalPath
    ? extensionFromPath(photo.originalPath)
    : "jpg";
  const ext = fromName ?? fromPath;
  const base =
    photo.originalName?.replace(/\.[^.]+$/, "") ??
    `photo-${photo.index + 1}`;
  const safeBase = base.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80);
  return `${String(photo.index + 1).padStart(2, "0")}-${safeBase}.${ext}`;
}

async function downloadOriginal(
  supabase: SupabaseClient,
  path: string
): Promise<ArrayBuffer> {
  const { data, error } = await supabase.storage
    .from(QUOTE_PHOTO_ORIGINALS_BUCKET)
    .download(path);

  if (error || !data) {
    throw new Error(error?.message ?? "Could not download original photo.");
  }

  return data.arrayBuffer();
}

async function downloadThumbnail(thumbnailUrl: string): Promise<ArrayBuffer> {
  const response = await fetch(thumbnailUrl);
  if (!response.ok) {
    throw new Error("Could not download thumbnail photo.");
  }
  return response.arrayBuffer();
}

async function downloadPhotoBuffer(
  supabase: SupabaseClient,
  photo: QuotePhotoThumbnail
): Promise<ArrayBuffer> {
  if (photo.originalPath) {
    try {
      return await downloadOriginal(supabase, photo.originalPath);
    } catch {
      // Fall through to thumbnail when originals are unavailable
    }
  }

  if (photo.thumbnailUrl) {
    return downloadThumbnail(photo.thumbnailUrl);
  }

  throw new Error(`Could not download photo ${photo.index + 1}.`);
}

export async function buildQuotePhotosZipBuffer(
  supabase: SupabaseClient,
  photos: QuotePhotoThumbnail[]
): Promise<Buffer> {
  if (photos.length === 0) {
    throw new Error("No photos to download.");
  }

  const zip = new JSZip();

  await Promise.all(
    photos.map(async (photo) => {
      const buffer = await downloadPhotoBuffer(supabase, photo);
      zip.file(zipEntryName(photo), buffer);
    })
  );

  const zipArrayBuffer = await zip.generateAsync({
    type: "arraybuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return Buffer.from(zipArrayBuffer);
}

export function safeZipFilename(quoteReference: string): string {
  const safeRef = quoteReference.replace(/[^a-zA-Z0-9-]+/g, "-");
  return `${safeRef}-photos.zip`;
}

/** @internal Used when verifying bucket access in tests */
export const PHOTO_BUCKETS = {
  originals: QUOTE_PHOTO_ORIGINALS_BUCKET,
  thumbnails: QUOTE_PHOTOS_BUCKET,
} as const;