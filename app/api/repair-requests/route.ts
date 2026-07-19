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
    const dataUrl = typeof photo.dataUrl === "string" ? photo.dataUrl : "";
    if (dataUrl.length > MAX_PHOTO_DATA_URL_CHARS) {
      throw new Error(
        "One or more photos are too large. Please use smaller images."
      );
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

function logRepairError(
  stage: string,
  error: unknown,
  extra?: Record<string, unknown>
) {
  const supabaseError =
    error && typeof error === "object"
      ? (error as {
          code?: string;
          message?: string;
          details?: string | null;
          hint?: string | null;
        })
      : null;

  console.error("[repair-requests]", {
    stage,
    message:
      supabaseError?.message ??
      (error instanceof Error ? error.message : String(error)),
    code: supabaseError?.code,
    details: supabaseError?.details,
    hint: supabaseError?.hint,
    ...extra,
  });
}

/** Map common Supabase/PostgREST failures to actionable client messages. */
function mapInsertError(error: {
  code?: string;
  message?: string;
}): { status: number; error: string; code?: string } {
  const code = error.code ?? "unknown";
  const message = (error.message ?? "").toLowerCase();

  // Table missing / not exposed in API schema cache
  if (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("could not find the table") ||
    message.includes("does not exist")
  ) {
    return {
      status: 503,
      code,
      error:
        "Repair requests table is not available. Apply migration 018_repair_requests.sql in Supabase, then retry.",
    };
  }

  // RLS / privilege issues
  if (code === "42501" || message.includes("row-level security")) {
    return {
      status: 503,
      code,
      error:
        "Database permissions blocked this submit. Confirm the anon INSERT policy on repair_requests is enabled.",
    };
  }

  // Check constraint / validation at DB layer
  if (code === "23514") {
    return {
      status: 422,
      code,
      error: "One or more fields failed validation. Please review and try again.",
    };
  }

  return {
    status: 500,
    code,
    error: "Could not submit your repair request. Please try again.",
  };
}

function ensureSupabaseEnv():
  | { ok: true }
  | { ok: false; response: NextResponse } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    logRepairError("env", new Error("Missing Supabase env vars"), {
      hasUrl: Boolean(url),
      hasAnonKey: Boolean(anonKey),
    });
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
          code: "missing_env",
        },
        { status: 503 }
      ),
    };
  }

  return { ok: true };
}

export async function POST(request: Request) {
  try {
    const env = ensureSupabaseEnv();
    if (!env.ok) return env.response;

    let body: CreateRepairRequestBody;
    try {
      body = (await request.json()) as CreateRepairRequestBody;
    } catch (err) {
      logRepairError("parse_body", err);
      return NextResponse.json(
        { error: "Invalid request body.", code: "invalid_json" },
        { status: 400 }
      );
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
        { error: "Select a valid service type.", code: "invalid_service_type" },
        { status: 422 }
      );
    }
    if (description.length < 10) {
      return NextResponse.json(
        {
          error: "Please describe the problem (at least 10 characters).",
          code: "invalid_description",
        },
        { status: 422 }
      );
    }
    if (!/^\d{5}$/.test(zip)) {
      return NextResponse.json(
        { error: "Enter a valid 5-digit zip code.", code: "invalid_zip" },
        { status: 422 }
      );
    }
    if (!URGENCY_VALUES.has(urgency)) {
      return NextResponse.json(
        { error: "Select a valid urgency level.", code: "invalid_urgency" },
        { status: 422 }
      );
    }
    if (!name) {
      return NextResponse.json(
        { error: "Enter your name.", code: "invalid_name" },
        { status: 422 }
      );
    }
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Enter a valid email address.", code: "invalid_email" },
        { status: 422 }
      );
    }

    let photos;
    try {
      photos = sanitizePhotos(body.photos);
    } catch (err) {
      logRepairError("sanitize_photos", err, {
        photoCount: Array.isArray(body.photos) ? body.photos.length : 0,
      });
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Could not process photos. Please try again.",
          code: "invalid_photos",
        },
        { status: 422 }
      );
    }

    const supabase = createAnonSupabaseClient();

    // Important: do NOT chain .select() after insert.
    // Anon is allowed to INSERT but not SELECT (by design). PostgREST
    // `Prefer: return=representation` would fail RLS and surface as 500.
    const { error } = await supabase.from("repair_requests").insert({
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
    });

    if (error) {
      logRepairError("insert", error, {
        serviceType,
        zip,
        urgency,
        photoCount: photos.length,
        hasLocation: Boolean(location),
      });
      const mapped = mapInsertError(error);
      return NextResponse.json(
        { error: mapped.error, code: mapped.code },
        { status: mapped.status }
      );
    }

    console.info("[repair-requests] insert ok", {
      serviceType,
      zip,
      urgency,
      photoCount: photos.length,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    logRepairError("unhandled", err);
    return NextResponse.json(
      {
        error: "Unexpected server error. Please try again.",
        code: "unhandled",
        detail: err instanceof Error ? err.message : undefined,
      },
      { status: 500 }
    );
  }
}
