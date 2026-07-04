import { Resend } from "resend";

let _client: Resend | null = null;

function getResendClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!_client) _client = new Resend(apiKey);
  return _client;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  /** Plain-text fallback (optional but good practice) */
  text?: string;
}

export interface SendEmailResult {
  sent: boolean;
  /** Resend message ID if sent successfully */
  messageId?: string;
  /** Human-readable reason if not sent */
  skippedReason?: string;
  error?: string;
}

/**
 * Send a transactional email via Resend.
 *
 * Gracefully no-ops when RESEND_API_KEY or RESEND_FROM_EMAIL is not configured
 * so the app works fully without email set up.
 */
export async function sendEmail(
  opts: SendEmailOptions
): Promise<SendEmailResult> {
  const client = getResendClient();
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!client) {
    console.info("[email] Skipped — RESEND_API_KEY not configured.");
    return { sent: false, skippedReason: "RESEND_API_KEY not set" };
  }

  if (!fromEmail) {
    console.info("[email] Skipped — RESEND_FROM_EMAIL not configured.");
    return { sent: false, skippedReason: "RESEND_FROM_EMAIL not set" };
  }

  if (!opts.to || !opts.to.includes("@")) {
    console.info("[email] Skipped — recipient address is empty or invalid.");
    return { sent: false, skippedReason: "Invalid recipient address" };
  }

  try {
    const { data, error } = await client.emails.send({
      from: `Mercurius Quote Tool <${fromEmail}>`,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });

    if (error) {
      console.error("[email] Resend API error:", error);
      return { sent: false, error: String(error) };
    }

    console.info("[email] Sent:", data?.id, "→", opts.to);
    return { sent: true, messageId: data?.id };
  } catch (err) {
    console.error("[email] Unexpected send error:", err);
    return { sent: false, error: String(err) };
  }
}
