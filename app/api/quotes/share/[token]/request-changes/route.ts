import { NextResponse } from "next/server";
import { createAnonSupabaseClient } from "@/lib/supabase/anon";
import { sendEmail } from "@/lib/email/resend";
import { changeRequestEmail } from "@/lib/email/templates";

interface RequestChangesBody {
  message: string;
  requesterName?: string;
  requesterPhone?: string;
}

function getClientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return request.headers.get("x-real-ip") ?? null;
}

function buildDashboardUrl(request: Request, quoteId: string): string {
  const origin = new URL(request.url).origin;
  return `${origin}/?quoteId=${quoteId}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const trimmed = token?.trim();

    if (!trimmed || trimmed.length < 32) {
      return NextResponse.json({ error: "Invalid share link." }, { status: 400 });
    }

    let body: RequestChangesBody;
    try {
      body = (await request.json()) as RequestChangesBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { message, requesterName, requesterPhone } = body;

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Please describe what you'd like changed." },
        { status: 422 }
      );
    }

    if (message.trim().length > 2000) {
      return NextResponse.json(
        { error: "Message is too long (max 2000 characters)." },
        { status: 422 }
      );
    }

    const ipAddress = getClientIp(request);
    const supabase = createAnonSupabaseClient();

    const { data, error } = await supabase.rpc(
      "submit_change_request_by_share_token",
      {
        p_token: trimmed,
        p_message: message.trim(),
        p_requester_name: requesterName?.trim() || null,
        p_requester_phone: requesterPhone?.trim() || null,
        p_ip_address: ipAddress,
      }
    );

    if (error) {
      console.error("Change request RPC error:", error);
      return NextResponse.json(
        { error: "Could not submit your request. Please try again." },
        { status: 500 }
      );
    }

    const result = data as {
      error?: string;
      success?: boolean;
      request_id?: string;
      quote_id?: string;
      user_id?: string;
      reference?: string;
      job_name?: string;
      service_type?: string;
    };

    if (result.error === "not_found") {
      return NextResponse.json(
        { error: "Quote not found or link has expired." },
        { status: 404 }
      );
    }

    if (result.error === "already_accepted") {
      return NextResponse.json(
        { error: "This quote has already been accepted and cannot be changed." },
        { status: 409 }
      );
    }

    if (result.error === "invalid_token") {
      return NextResponse.json({ error: "Invalid share link." }, { status: 400 });
    }

    if (result.error === "message_required") {
      return NextResponse.json(
        { error: "Please describe what you'd like changed." },
        { status: 422 }
      );
    }

    if (!result.success) {
      return NextResponse.json(
        { error: "Could not submit your request. Please try again." },
        { status: 500 }
      );
    }

    // --- Fire change request notification email (non-blocking) ---
    if (result.user_id && result.quote_id) {
      void sendChangeRequestNotification({
        request,
        userId: result.user_id,
        quoteId: result.quote_id,
        reference: result.reference ?? "—",
        jobName: result.job_name ?? "—",
        serviceType: result.service_type ?? "—",
        message: message.trim(),
        requesterName: requesterName?.trim() || null,
        requesterPhone: requesterPhone?.trim() || null,
        submittedAt: new Date().toISOString(),
        supabase,
      });
    }

    return NextResponse.json({ submitted: true, requestId: result.request_id });
  } catch (error) {
    console.error("Request changes route error:", error);
    return NextResponse.json(
      { error: "Could not submit your request. Please try again." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Change request notification — async after responding to homeowner
// ---------------------------------------------------------------------------
async function sendChangeRequestNotification(opts: {
  request: Request;
  userId: string;
  quoteId: string;
  reference: string;
  jobName: string;
  serviceType: string;
  message: string;
  requesterName: string | null;
  requesterPhone: string | null;
  submittedAt: string;
  supabase: ReturnType<typeof createAnonSupabaseClient>;
}) {
  try {
    const { data: profileData, error: profileError } = await opts.supabase.rpc(
      "get_vendor_email_for_notification",
      { p_user_id: opts.userId }
    );

    if (profileError || !profileData) {
      console.warn("[email] Could not fetch vendor email for change request:", profileError);
      return;
    }

    const vendor = profileData as { email: string; business_name: string } | null;
    if (!vendor?.email) {
      console.info("[email] Vendor has no email set — skipping change request notification.");
      return;
    }

    const dashboardUrl = buildDashboardUrl(opts.request, opts.quoteId);
    const emailData = changeRequestEmail({
      contractorName: vendor.business_name,
      contractorEmail: vendor.email,
      quoteReference: opts.reference,
      jobName: opts.jobName,
      serviceType: opts.serviceType,
      requesterName: opts.requesterName,
      requesterPhone: opts.requesterPhone,
      message: opts.message,
      submittedAt: opts.submittedAt,
      dashboardUrl,
    });

    await sendEmail({ to: vendor.email, ...emailData });
  } catch (err) {
    console.error("[email] Change request notification failed:", err);
  }
}
