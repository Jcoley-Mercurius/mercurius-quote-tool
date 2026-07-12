import { NextResponse } from "next/server";
import { createAnonSupabaseClient } from "@/lib/supabase/anon";
import { sendEmail } from "@/lib/email/resend";
import { quoteAcceptedEmail } from "@/lib/email/templates";

interface AcceptQuoteBody {
  signerName: string;
  signatureData: string; // base64 PNG data URL
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

    let body: AcceptQuoteBody;
    try {
      body = (await request.json()) as AcceptQuoteBody;
    } catch {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }

    const { signerName, signatureData } = body;

    if (!signerName?.trim()) {
      return NextResponse.json(
        { error: "Your full name is required to accept this quote." },
        { status: 422 }
      );
    }

    if (!signatureData || signatureData.length < 100) {
      return NextResponse.json(
        { error: "A signature is required to accept this quote." },
        { status: 422 }
      );
    }

    const ipAddress = getClientIp(request);
    const supabase = createAnonSupabaseClient();

    const { data, error } = await supabase.rpc("accept_quote_by_share_token", {
      p_token: trimmed,
      p_signer_name: signerName.trim(),
      p_signature_data: signatureData,
      p_ip_address: ipAddress,
    });

    if (error) {
      console.error("Accept quote RPC error:", error);
      return NextResponse.json(
        { error: "Could not process your acceptance. Please try again." },
        { status: 500 }
      );
    }

    const result = data as {
      error?: string;
      success?: boolean;
      acceptance_id?: string;
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
        { error: "already_accepted", message: "This quote has already been accepted." },
        { status: 409 }
      );
    }

    if (result.error === "expired") {
      return NextResponse.json(
        { error: "expired", message: "This quote has expired and can no longer be accepted. Please contact your contractor for an updated estimate." },
        { status: 410 }
      );
    }

    if (result.error === "invalid_token") {
      return NextResponse.json({ error: "Invalid share link." }, { status: 400 });
    }

    if (result.error === "signer_name_required") {
      return NextResponse.json({ error: "Your full name is required." }, { status: 422 });
    }

    if (result.error === "signature_required") {
      return NextResponse.json({ error: "A signature is required." }, { status: 422 });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: "Could not process your acceptance. Please try again." },
        { status: 500 }
      );
    }

    // --- Fire acceptance notification email (non-blocking) ---
    if (result.user_id && result.quote_id) {
      void sendAcceptanceNotification({
        request,
        userId: result.user_id,
        quoteId: result.quote_id,
        reference: result.reference ?? "—",
        jobName: result.job_name ?? "—",
        serviceType: result.service_type ?? "—",
        signerName: signerName.trim(),
        acceptedAt: new Date().toISOString(),
        supabase,
      });
    }

    return NextResponse.json({
      accepted: true,
      acceptanceId: result.acceptance_id,
    });
  } catch (error) {
    console.error("Accept quote route error:", error);
    return NextResponse.json(
      { error: "Could not process your acceptance. Please try again." },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// Acceptance notification — runs async after responding to the homeowner
// ---------------------------------------------------------------------------
async function sendAcceptanceNotification(opts: {
  request: Request;
  userId: string;
  quoteId: string;
  reference: string;
  jobName: string;
  serviceType: string;
  signerName: string;
  acceptedAt: string;
  supabase: ReturnType<typeof createAnonSupabaseClient>;
}) {
  try {
    // Fetch the vendor profile using the service-role-equivalent anon RPC
    // (We need the contractor's email — use a secure DB function)
    const { data: profileData, error: profileError } = await opts.supabase.rpc(
      "get_vendor_email_for_notification",
      { p_user_id: opts.userId }
    );

    if (profileError || !profileData) {
      console.warn("[email] Could not fetch vendor email for notification:", profileError);
      return;
    }

    const vendor = profileData as { email: string; business_name: string } | null;
    if (!vendor?.email) {
      console.info("[email] Vendor has no email set — skipping acceptance notification.");
      return;
    }

    const dashboardUrl = buildDashboardUrl(opts.request, opts.quoteId);
    const emailData = quoteAcceptedEmail({
      contractorName: vendor.business_name,
      contractorEmail: vendor.email,
      signerName: opts.signerName,
      quoteReference: opts.reference,
      jobName: opts.jobName,
      serviceType: opts.serviceType,
      acceptedAt: opts.acceptedAt,
      dashboardUrl,
    });

    await sendEmail({ to: vendor.email, ...emailData });
  } catch (err) {
    console.error("[email] Acceptance notification failed:", err);
  }
}
