import { buildQuotePhotosZipBuffer, safeZipFilename } from "@/lib/quote/photo-zip";
import type { QuotePhotoThumbnail } from "@/lib/quote/types";
import {
  createSupabaseClientWithToken,
  getBearerToken,
} from "@/lib/supabase/server";
import type { GeneratedQuote } from "@/lib/quote/types";

interface QuotePhotoRow {
  reference: string;
  quote_data: GeneratedQuote;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const token = getBearerToken(request);

    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseClientWithToken(token);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: quote, error: quoteError } = await supabase
      .from("quotes")
      .select("reference, quote_data")
      .eq("id", id)
      .maybeSingle();

    if (quoteError) {
      console.error("Quote fetch error:", quoteError);
      return Response.json({ error: "Could not load quote." }, { status: 500 });
    }

    if (!quote) {
      return Response.json({ error: "Quote not found." }, { status: 404 });
    }

    const row = quote as QuotePhotoRow;
    const photos = row.quote_data?.photoThumbnails ?? [];

    if (photos.length === 0) {
      return Response.json({ error: "No photos for this quote." }, { status: 404 });
    }

    const zipBuffer = await buildQuotePhotosZipBuffer(
      supabase,
      photos as QuotePhotoThumbnail[]
    );

    const filename = safeZipFilename(row.reference);

    return new Response(new Uint8Array(zipBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Photo zip download error:", error);
    return Response.json(
      { error: "Could not prepare photo download." },
      { status: 500 }
    );
  }
}