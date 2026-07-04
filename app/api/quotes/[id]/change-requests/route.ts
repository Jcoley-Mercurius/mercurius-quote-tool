import { NextResponse } from "next/server";
import {
  createSupabaseClientWithToken,
  getBearerToken,
} from "@/lib/supabase/server";

export interface ChangeRequestData {
  id: string;
  quoteId: string;
  message: string;
  requesterName: string | null;
  requesterPhone: string | null;
  ipAddress: string | null;
  submittedAt: string;
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

    const { data, error } = await supabase.rpc("get_quote_change_requests", {
      p_quote_id: id,
    });

    if (error) {
      console.error("Get change requests error:", error);
      return NextResponse.json(
        { error: "Could not load change requests." },
        { status: 500 }
      );
    }

    const rows = (Array.isArray(data) ? data : []) as Array<{
      id: string;
      quote_id: string;
      message: string;
      requester_name: string | null;
      requester_phone: string | null;
      ip_address: string | null;
      submitted_at: string;
    }>;

    const changeRequests: ChangeRequestData[] = rows.map((row) => ({
      id: row.id,
      quoteId: row.quote_id,
      message: row.message,
      requesterName: row.requester_name,
      requesterPhone: row.requester_phone,
      ipAddress: row.ip_address,
      submittedAt: row.submitted_at,
    }));

    return NextResponse.json({ changeRequests });
  } catch (error) {
    console.error("Change requests route error:", error);
    return NextResponse.json(
      { error: "Could not load change requests." },
      { status: 500 }
    );
  }
}
