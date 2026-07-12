import { NextResponse } from "next/server";
import { buildClientQuoteUrl, generateShareToken } from "@/lib/quotes/share";
import {
  createSupabaseClientWithToken,
  getBearerToken,
} from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { sendQuoteToClientEmail } from "@/lib/email/templates";

interface SendEmailBody {
  clientName?: string;
  clientEmail: string;
  personalNote?: string;
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

    // Parse + validate body
    let body: SendEmailBody;
    try {
      body = (await request.json()) as SendEmailBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const clientEmail = body.clientEmail?.trim();
    if (!clientEmail || !clientEmail.includes("@")) {
      return NextResponse.json(
        { error: "A valid client email address is required." },
        { status: 400 }
      );
    }

    // Auth
    const supabase = createSupabaseClientWithToken(accessToken);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Load the quote — also pulls vendor_snapshot for branding and reference/job_name
    const { data: quoteRow, error: fetchError } = await supabase
      .from("quotes")
      .select(
        "id, status, share_token, reference, job_name, vendor_snapshot"
      )
      .eq("id", id)
      .maybeSingle();

    if (fetchError) {
      console.error("[send-email] quote fetch error:", fetchError);
      return NextResponse.json(
        { error: "Could not load quote." },
        { status: 500 }
      );
    }

    if (!quoteRow) {
      return NextResponse.json({ error: "Quote not found." }, { status: 404 });
    }

    // Ensure there is a share token (generate one if missing, just like the share route)
    const shareToken =
      (quoteRow.share_token as string | null) ?? generateShareToken();
    const origin = new URL(request.url).origin;
    const quoteUrl = buildClientQuoteUrl(shareToken, origin);

    // Build updates: always persist share token, mark as "sent" if still draft
    const updates: Record<string, string> = {
      share_token: shareToken,
      shared_at: new Date().toISOString(),
    };
    const wasPromotedToSent = quoteRow.status === "draft";
    if (wasPromotedToSent) {
      updates.status = "sent";
    }

    const { error: updateError } = await supabase
      .from("quotes")
      .update(updates)
      .eq("id", id);

    if (updateError) {
      console.error("[send-email] quote update error:", updateError);
      return NextResponse.json(
        { error: "Could not update quote status." },
        { status: 500 }
      );
    }

    // Derive contractor display info from user profile + vendor snapshot
    const vendorSnapshot = quoteRow.vendor_snapshot as {
      businessName?: string;
    } | null;

    const contractorName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "Your Contractor";

    const businessName =
      vendorSnapshot?.businessName || contractorName;

    // Build and send the email
    const emailPayload = sendQuoteToClientEmail({
      clientName: body.clientName?.trim() || null,
      contractorName,
      businessName,
      quoteReference: quoteRow.reference as string,
      jobName: quoteRow.job_name as string,
      quoteUrl,
      personalNote: body.personalNote?.trim() || null,
    });

    const result = await sendEmail({
      to: clientEmail,
      subject: emailPayload.subject,
      html: emailPayload.html,
      text: emailPayload.text,
    });

    if (!result.sent && result.error) {
      console.error("[send-email] Resend error:", result.error);
      return NextResponse.json(
        { error: "Email delivery failed. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      sent: result.sent,
      skippedReason: result.skippedReason ?? null,
      statusUpdated: wasPromotedToSent ? "sent" : null,
    });
  } catch (error) {
    console.error("[send-email] route error:", error);
    return NextResponse.json(
      { error: "Could not send email." },
      { status: 500 }
    );
  }
}
