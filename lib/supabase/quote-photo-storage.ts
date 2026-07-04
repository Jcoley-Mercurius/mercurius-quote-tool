import { getSupabaseClient } from "./client";

export const QUOTE_PHOTOS_BUCKET = "quote-photos";
export const QUOTE_PHOTO_ORIGINALS_BUCKET = "quote-photo-originals";

const THUMBNAIL_MIME = "image/webp";
const SIGNED_URL_EXPIRY_SECONDS = 3600;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
};

function photoExtension(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType] ?? "jpg";
}

function quotePhotoBasePath(
  userId: string,
  quoteId: string,
  organizationId?: string | null
): string {
  if (organizationId) {
    return `org/${organizationId}/photos/${quoteId}`;
  }
  return `${userId}/photos/${quoteId}`;
}

function thumbnailPath(
  userId: string,
  quoteId: string,
  index: number,
  organizationId?: string | null
): string {
  return `${quotePhotoBasePath(userId, quoteId, organizationId)}/${index}.webp`;
}

function originalPath(
  userId: string,
  quoteId: string,
  index: number,
  mimeType: string,
  organizationId?: string | null
): string {
  return `${quotePhotoBasePath(userId, quoteId, organizationId)}/originals/${index}.${photoExtension(mimeType)}`;
}

async function deleteStorageFolder(bucket: string, folder: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list(folder);

  if (listError) {
    throw new Error(listError.message);
  }

  if (!files?.length) return;

  const filePaths: string[] = [];

  for (const file of files) {
    const path = `${folder}/${file.name}`;
    if (file.metadata || file.id) {
      filePaths.push(path);
    } else {
      await deleteStorageFolder(bucket, path);
    }
  }

  if (filePaths.length > 0) {
    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(filePaths);

    if (removeError) {
      throw new Error(removeError.message);
    }
  }
}

export async function uploadQuotePhotoThumbnails(
  userId: string,
  quoteId: string,
  thumbnails: Blob[],
  organizationId?: string | null
): Promise<string[]> {
  const supabase = getSupabaseClient();
  const urls: string[] = [];

  for (let index = 0; index < thumbnails.length; index++) {
    const path = thumbnailPath(userId, quoteId, index, organizationId);
    const { error } = await supabase.storage
      .from(QUOTE_PHOTOS_BUCKET)
      .upload(path, thumbnails[index], {
        upsert: true,
        contentType: THUMBNAIL_MIME,
        cacheControl: "86400",
      });

    if (error) {
      throw new Error(error.message);
    }

    const { data } = supabase.storage.from(QUOTE_PHOTOS_BUCKET).getPublicUrl(path);
    urls.push(data.publicUrl);
  }

  return urls;
}

export async function uploadQuotePhotoOriginals(
  userId: string,
  quoteId: string,
  files: File[],
  organizationId?: string | null
): Promise<string[]> {
  const supabase = getSupabaseClient();
  const paths: string[] = [];

  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const path = originalPath(
      userId,
      quoteId,
      index,
      file.type || "image/jpeg",
      organizationId
    );

    const { error } = await supabase.storage
      .from(QUOTE_PHOTO_ORIGINALS_BUCKET)
      .upload(path, file, {
        upsert: true,
        contentType: file.type || "image/jpeg",
        cacheControl: "3600",
      });

    if (error) {
      throw new Error(error.message);
    }

    paths.push(path);
  }

  return paths;
}

export async function getQuotePhotoSignedUrl(
  originalPath: string,
  expiresIn = SIGNED_URL_EXPIRY_SECONDS
): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage
    .from(QUOTE_PHOTO_ORIGINALS_BUCKET)
    .createSignedUrl(originalPath, expiresIn);

  if (error || !data?.signedUrl) {
    throw new Error(error?.message ?? "Could not create signed URL for photo.");
  }

  return data.signedUrl;
}

export async function deleteQuotePhotos(
  userId: string,
  quoteId: string,
  organizationId?: string | null
): Promise<void> {
  const basePath = quotePhotoBasePath(userId, quoteId, organizationId);

  await Promise.all([
    deleteStorageFolder(QUOTE_PHOTOS_BUCKET, basePath),
    deleteStorageFolder(QUOTE_PHOTO_ORIGINALS_BUCKET, `${basePath}/originals`),
  ]);
}

/** @deprecated Use deleteQuotePhotos */
export async function deleteQuotePhotoThumbnails(
  userId: string,
  quoteId: string,
  organizationId?: string | null
): Promise<void> {
  await deleteQuotePhotos(userId, quoteId, organizationId);
}