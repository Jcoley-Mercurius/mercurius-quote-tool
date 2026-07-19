import { NextResponse } from "next/server";
import { createAnonSupabaseClient } from "@/lib/supabase/anon";

const SERVICE_TYPES = new Set([
  "hvac",
  "pool",
  "lawn",
  "plumbing",
  "roofing",
  "electrical",
  "general",
]);

const URGENCY_VALUES = new Set([
  "emergency",
  "urgent",
  "soon",
  "flexible",
]);

const MAX_PHOTOS = 8;
const MAX_PHOTO_DATA_URL_CHARS = 2_500_000; // ~1.8MB decoded per photo

interface RepairPhotoInput {
  name?: string;
  mimeType?: string;
  dataUrl?: string;
  size?: number;
}

interface CreateRepairRequestBody {
  serviceType?: string;
  description?: string;
  location?: string;
  zip?: string;
  urgency?: string;
  photos?: RepairPhotoInput[];
  name?: string;
  email?: string;
  phone?: string;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function sanitizePhotos(photos: RepairPhotoInput[] | undefined) {
  if (!Array.isArray(photos) || photos.length === 0) return [];

  return photos.slice(0, MAX_PHOTOS).map((photo) => {
    const dataUrl =
      typeof photo.dataUrl === "string" ? photo.dataUrl : "";
    if (dataUrl.length > MAX_PHOTO_DATA_URL_CHARS) {
      throw new Error("One or more photos are too large. Please use smaller images.");
    }
    if (dataUrl && !dataUrl.startsWith("data:image/")) {
      throw new Error("Invalid photo format.");
    }

    return {
      name: typeof photo.name === "string" ? photo.name.slice(0, 200) : "",
      mimeType:
        typeof photo.mimeType === "string"
          ? photo.mimeType.slice(0, 100)
          : "image/jpeg",
      dataUrl,
      size: typeof photo.size === "number" ? photo.size : 0,
    };
  });
}

export async function POST(request: Request) {
  try {
    let body: CreateRepairRequestBody;
    try {
      body = (await request.json()) as CreateRepairRequestBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const serviceType = body.serviceType?.trim() ?? "";
    const description = body.description?.trim() ?? "";
    const location = body.location?.trim() ?? "";
    const zip = (body.zip ?? "").replace(/\D/g, "").slice(0, 5);
    const urgency = body.urgency?.trim() ?? "";
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const phone = body.phone?.trim() ?? "";

    if (!SERVICE_TYPES.has(serviceType)) {
      return NextResponse.json(
        { error: "Select a valid service type." },
        { status: 422 }
      );
    }
    if (description.length < 10) {
      return NextResponse.json(
        { error: "Please describe the problem (at least 10 characters)." },
        { status: 422 }
      );
    }
    if (!/^\d{5}$/.test(zip)) {
      return NextResponse.json(
        { error: "Enter a valid 5-digit zip code." },
        { status: 422 }
      );
    }
    if (!URGENCY_VALUES.has(urgency)) {
      return NextResponse.json(
        { error: "Select a valid urgency level." },
        { status: 422 }
      );
    }
    if (!name) {
      return NextResponse.json({ error: "Enter your name." }, { status: 422 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 422 }
      );
    }

    let photos;
    try {
      photos = sanitizePhotos(body.photos);
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Could not process photos. Please try again.",
        },
        { status: 422 }
      );
    }

    const supabase = createAnonSupabaseClient();
    const { data, error } = await supabase
      .from("repair_requests")
      .insert({
        service_type: serviceType,
        description,
        location,
        zip,
        urgency,
        photos,
        name,
        email,
        phone,
        status: "pending",
      })
      .select("id, created_at, status")
      .single();

    if (error) {
      console.error("repair_requests insert error:", error);
      return NextResponse.json(
        { error: "Could not submit your repair request. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      request: data,
    });
  } catch (err) {
    console.error("repair-requests POST failed:", err);
    return NextResponse.json(
      { error: "Unexpected server error. Please try again." },
      { status: 500 }
    );
  }
}
