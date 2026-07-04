import { NextResponse } from "next/server";
import { buildClientQuoteUrl, generateShareToken } from "@/lib/quotes/share";
import {
  createSupabaseClientWithToken,
  getBearerToken,
} from "@/lib/supabase/server";

interface QuoteShareRow {
  id: string;
  status: string;
  share_token: string | null;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const accessToken = getBearerToken(request);

    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseClientWithToken(accessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: quote, error: fetchError } = await supabase
      .from("quotes")
      .select("id, status, share_token")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("Share quote fetch error:", fetchError);
      return NextResponse.json(
        { error: "Could not load quote." },
        { status: 500 }
      );
    }

    if (!quote) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }

    const row = quote as QuoteShareRow;
    const shareToken = row.share_token ?? generateShareToken();
    const origin = new URL(request.url).origin;
    const updates: Record<string, string> = {
      share_token: shareToken,
      shared_at: new Date().toISOString(),
    };

    if (row.status === "draft") {
      updates.status = "sent";
    }

    const { error: updateError } = await supabase
      .from("quotes")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      console.error("Share token update error:", updateError);
      return NextResponse.json(
        { error: "Could not create share link." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      shareToken,
      shareUrl: buildClientQuoteUrl(shareToken, origin),
      statusUpdated: row.status === "draft" ? "sent" : row.status,
    });
  } catch (error) {
    console.error("Share quote route error:", error);
    return NextResponse.json(
      { error: "Could not create share link." },
      { status: 500 }
    );
  }
}