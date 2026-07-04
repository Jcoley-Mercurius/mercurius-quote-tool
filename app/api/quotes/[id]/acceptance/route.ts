import { NextResponse } from "next/server";
import {
  createSupabaseClientWithToken,
  getBearerToken,
} from "@/lib/supabase/server";

export interface QuoteAcceptanceData {
  id: string;
  quoteId: string;
  signerName: string;
  signatureData: string;
  ipAddress: string | null;
  acceptedAt: string;
}

export async function GET(
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

    const { data, error } = await supabase.rpc("get_quote_acceptance", {
      p_quote_id: id,
    });

    if (error) {
      console.error("Get quote acceptance error:", error);
      return NextResponse.json(
        { error: "Could not load acceptance details." },
        { status: 500 }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;

    if (!row) {
      return NextResponse.json({ acceptance: null });
    }

    const acceptance: QuoteAcceptanceData = {
      id: row.id as string,
      quoteId: row.quote_id as string,
      signerName: row.signer_name as string,
      signatureData: row.signature_data as string,
      ipAddress: (row.ip_address as string | null) ?? null,
      acceptedAt: row.accepted_at as string,
    };

    return NextResponse.json({ acceptance });
  } catch (error) {
    console.error("Get acceptance route error:", error);
    return NextResponse.json(
      { error: "Could not load acceptance details." },
      { status: 500 }
    );
  }
}
