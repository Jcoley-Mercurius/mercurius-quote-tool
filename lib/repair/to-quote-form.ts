import type { QuoteFormData, ServiceType } from "@/components/quote-form/types";
import { SERVICE_OPTIONS } from "@/components/quote-form/types";
import {
  REPAIR_URGENCY_LABELS,
  type RepairRequestDetail,
  type RepairRequestPhoto,
} from "./types";

const VALID_SERVICE_TYPES = new Set(
  SERVICE_OPTIONS.map((option) => option.id)
);

function isServiceType(value: string): value is ServiceType {
  return VALID_SERVICE_TYPES.has(value as ServiceType);
}

async function dataUrlToFile(photo: RepairRequestPhoto): Promise<File | null> {
  if (!photo.dataUrl?.startsWith("data:image/")) return null;

  try {
    const response = await fetch(photo.dataUrl);
    const blob = await response.blob();
    const mimeType =
      photo.mimeType || blob.type || "image/jpeg";
    const name =
      photo.name?.trim() ||
      `repair-photo.${mimeType.includes("png") ? "png" : "jpg"}`;
    return new File([blob], name, { type: mimeType });
  } catch (err) {
    console.error("[repair-requests] failed to decode photo:", err);
    return null;
  }
}

/**
 * Convert a repair request (with stored photo dataUrls) into QuoteFormData
 * for the quote wizard.
 */
export async function repairRequestToQuoteFormData(
  request: RepairRequestDetail
): Promise<QuoteFormData> {
  const photos = (
    await Promise.all(request.photos.map((photo) => dataUrlToFile(photo)))
  ).filter((file): file is File => file !== null);

  const urgencyLabel = REPAIR_URGENCY_LABELS[request.urgency] ?? request.urgency;
  const contactBits = [
    request.name,
    request.email,
    request.phone || null,
  ].filter(Boolean);

  const jobDescription = [
    request.description.trim(),
    "",
    "---",
    `Homeowner request · Urgency: ${urgencyLabel}`,
    contactBits.length > 0 ? `Contact: ${contactBits.join(" · ")}` : null,
  ]
    .filter((line) => line !== null)
    .join("\n");

  return {
    serviceType: isServiceType(request.serviceType) ? request.serviceType : "",
    propertyAddress: request.location,
    squareFootage: "",
    stories: "",
    yearBuilt: "",
    zipCode: request.zip,
    jobDescription,
    photos,
  };
}
