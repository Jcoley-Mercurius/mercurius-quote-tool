import { NextResponse } from "next/server";
import {
  rowToPublicQuote,
  type PublicQuoteRow,
} from "@/lib/quotes/public-quote";
import { createAnonSupabaseClient } from "@/lib/supabase/anon";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const trimmed = token?.trim();

    if (!trimmed || trimmed.length < 32) {
      return NextResponse.json({ error: "Invalid share link." }, { status: 400 });
    }

    const supabase = createAnonSupabaseClient();

    const { data, error } = await supabase.rpc("get_public_quote_by_share_token", {
      p_token: trimmed,
    });

    if (error) {
      console.error("Public quote fetch error:", error);
      return NextResponse.json(
        { error: "Could not load quote. Please try again later." },
        { status: 500 }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return NextResponse.json(
        { error: "Quote not found or link has expired." },
        { status: 404 }
      );
    }

    const payload = rowToPublicQuote(row as PublicQuoteRow);

    if (payload.status === "sent") {
      await supabase.rpc("mark_quote_viewed_by_share_token", {
        p_token: trimmed,
      });
      payload.status = "viewed";
    }

    return NextResponse.json({ quote: payload });
  } catch (error) {
    console.error("Public quote route error:", error);
    return NextResponse.json(
      { error: "Could not load quote." },
      { status: 500 }
    );
  }
}