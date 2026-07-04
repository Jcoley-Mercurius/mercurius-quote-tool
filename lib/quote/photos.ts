import {
  uploadQuotePhotoOriginals,
  uploadQuotePhotoThumbnails,
} from "@/lib/supabase/quote-photo-storage";
import type { QuotePhotoInput, QuotePhotoThumbnail } from "./types";

const MAX_PHOTOS = 8;
const THUMBNAIL_MAX_DIMENSION = 480;
const THUMBNAIL_QUALITY = 0.72;

export async function encodePhotosForApi(
  photos: File[]
): Promise<QuotePhotoInput[]> {
  const selected = photos.slice(0, MAX_PHOTOS);
  return Promise.all(
    selected.map(
      (file) =>
        new Promise<QuotePhotoInput>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result;
            if (typeof result !== "string") {
              reject(new Error("Could not read photo file."));
              return;
            }
            resolve({
              dataUrl: result,
              mimeType: file.type || "image/jpeg",
            });
          };
          reader.onerror = () => reject(new Error("Could not read photo file."));
          reader.readAsDataURL(file);
        })
    )
  );
}

export function estimatePhotoPayloadBytes(photos: QuotePhotoInput[]): number {
  return photos.reduce((total, photo) => {
    const base64 = photo.dataUrl.split(",")[1] ?? "";
    return total + Math.ceil((base64.length * 3) / 4);
  }, 0);
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load photo for thumbnail."));
    };
    image.src = url;
  });
}

export async function createPhotoThumbnail(file: File): Promise<Blob> {
  const image = await loadImage(file);
  const scale = Math.min(
    1,
    THUMBNAIL_MAX_DIMENSION / Math.max(image.width, image.height)
  );
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create thumbnail canvas.");
  }

  context.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", THUMBNAIL_QUALITY);
  });

  if (!blob) {
    throw new Error("Could not compress photo thumbnail.");
  }

  return blob;
}

export async function persistQuotePhotos(
  userId: string,
  quoteId: string,
  photos: File[],
  organizationId?: string | null
): Promise<QuotePhotoThumbnail[]> {
  const selected = photos.slice(0, MAX_PHOTOS);
  if (selected.length === 0) return [];

  const [thumbnails, originalPaths] = await Promise.all([
    Promise.all(selected.map((file) => createPhotoThumbnail(file))),
    uploadQuotePhotoOriginals(userId, quoteId, selected, organizationId),
  ]);
  const urls = await uploadQuotePhotoThumbnails(
    userId,
    quoteId,
    thumbnails,
    organizationId
  );

  return urls.map((thumbnailUrl, index) => ({
    thumbnailUrl,
    originalPath: originalPaths[index],
    index,
    originalName: selected[index]?.name ?? `photo-${index + 1}`,
  }));
}

/** @deprecated Use persistQuotePhotos */
export async function persistQuotePhotoThumbnails(
  userId: string,
  quoteId: string,
  photos: File[],
  organizationId?: string | null
): Promise<QuotePhotoThumbnail[]> {
  return persistQuotePhotos(userId, quoteId, photos, organizationId);
}