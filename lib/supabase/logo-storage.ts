import { getSupabaseClient } from "./client";

export const LOGOS_BUCKET = "logos";

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};

function logoExtension(mimeType: string): string {
  return EXTENSION_BY_MIME[mimeType] ?? "png";
}

function logoPathForUser(userId: string, mimeType: string): string {
  return `${userId}/logo.${logoExtension(mimeType)}`;
}

function logoPathForOrganization(organizationId: string, mimeType: string): string {
  return `org/${organizationId}/logo.${logoExtension(mimeType)}`;
}

export async function uploadVendorLogo(
  userId: string,
  file: File
): Promise<string> {
  const supabase = getSupabaseClient();
  const path = logoPathForUser(userId, file.type);

  const { error } = await supabase.storage.from(LOGOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(LOGOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteVendorLogo(userId: string): Promise<void> {
  await deleteLogoFolder(userId);
}

export async function uploadOrganizationLogo(
  organizationId: string,
  file: File
): Promise<string> {
  const supabase = getSupabaseClient();
  const path = logoPathForOrganization(organizationId, file.type);

  const { error } = await supabase.storage.from(LOGOS_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
    cacheControl: "3600",
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(LOGOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteOrganizationLogo(
  organizationId: string
): Promise<void> {
  await deleteLogoFolder(`org/${organizationId}`);
}

async function deleteLogoFolder(folder: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { data: files, error: listError } = await supabase.storage
    .from(LOGOS_BUCKET)
    .list(folder);

  if (listError) {
    throw new Error(listError.message);
  }

  if (!files?.length) return;

  const paths = files.map((file) => `${folder}/${file.name}`);
  const { error: removeError } = await supabase.storage
    .from(LOGOS_BUCKET)
    .remove(paths);

  if (removeError) {
    throw new Error(removeError.message);
  }
}