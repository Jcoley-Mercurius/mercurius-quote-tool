/**
 * Email templates for Mercurius Quote Tool transactional emails.
 * All functions return { subject, html, text } ready for sendEmail().
 *
 * Templates:
 *   quoteAcceptedEmail       — Contractor notification: homeowner accepted
 *   changeRequestEmail       — Contractor notification: homeowner requested changes
 *   sendQuoteToClientEmail   — Client-facing: contractor sends quote link to homeowner
 */

interface AcceptanceEmailData {
  contractorName: string;
  contractorEmail: string;
  signerName: string;
  quoteReference: string;
  jobName: string;
  serviceType: string;
  acceptedAt: string; // ISO string
  /** Full URL back to the contractor's quote dashboard */
  dashboardUrl: string;
}

interface ChangeRequestEmailData {
  contractorName: string;
  contractorEmail: string;
  quoteReference: string;
  jobName: string;
  serviceType: string;
  requesterName: string | null;
  requesterPhone: string | null;
  message: string;
  submittedAt: string; // ISO string
  dashboardUrl: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

// ---------------------------------------------------------------------------
// Shared base HTML wrapper
// ---------------------------------------------------------------------------
function emailBase(body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Mercurius Quote Tool</title>
  <style>
    body { margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #1a3a5c; padding: 28px 32px; }
    .header-title { color: #ffffff; font-size: 18px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
    .header-sub { color: #94a3b8; font-size: 13px; margin: 4px 0 0; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; color: #1e293b; margin: 0 0 20px; }
    .callout { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px 24px; margin: 24px 0; }
    .callout-accent { background: #eff6ff; border-color: #bfdbfe; }
    .callout-warn { background: #fffbeb; border-color: #fde68a; }
    .callout-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 0 0 8px; }
    .callout-value { font-size: 20px; font-weight: 700; color: #0f172a; margin: 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
    .detail-row:last-child { border-bottom: none; }
    .detail-label { font-size: 13px; color: #64748b; }
    .detail-value { font-size: 13px; font-weight: 600; color: #1e293b; text-align: right; max-width: 280px; word-break: break-word; }
    .cta-wrapper { text-align: center; margin: 32px 0 8px; }
    .cta-btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 10px; letter-spacing: -0.01em; }
    .message-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin: 24px 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap; }
    .footer { background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <p class="header-title">Mercurius Quote Tool</p>
      <p class="header-sub">Contractor notification</p>
    </div>
    <div class="body">${body}</div>
    <div class="footer">
      This notification was sent because you use Mercurius Quote Tool.<br/>
      You received this email because a homeowner interacted with one of your shared quotes.
    </div>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Quote Accepted Email
// ---------------------------------------------------------------------------
export function quoteAcceptedEmail(data: AcceptanceEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const acceptedFormatted = formatDate(data.acceptedAt);
  const displayName = data.contractorName || data.contractorEmail.split("@")[0];

  const html = emailBase(`
    <p class="greeting">Hi ${displayName},</p>
    <p style="font-size:15px;color:#334155;margin:0 0 8px;">
      Great news — a homeowner has <strong>accepted your quote</strong> and signed electronically.
    </p>

    <div class="callout">
      <p class="callout-label">Quote accepted</p>
      <p class="callout-value">${data.quoteReference}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <tr class="detail-row">
        <td class="detail-label">Job</td>
        <td class="detail-value">${data.jobName}</td>
      </tr>
      <tr class="detail-row">
        <td class="detail-label">Service type</td>
        <td class="detail-value">${data.serviceType}</td>
      </tr>
      <tr class="detail-row">
        <td class="detail-label">Signed by</td>
        <td class="detail-value">${data.signerName}</td>
      </tr>
      <tr class="detail-row">
        <td class="detail-label">Accepted on</td>
        <td class="detail-value">${acceptedFormatted}</td>
      </tr>
    </table>

    <p style="font-size:14px;color:#475569;margin:0 0 8px;">
      Open the quote in your dashboard to view the full signature and acceptance record, then follow up to schedule the job.
    </p>

    <div class="cta-wrapper">
      <a href="${data.dashboardUrl}" class="cta-btn">View Accepted Quote</a>
    </div>
  `);

  const text = [
    `Hi ${displayName},`,
    ``,
    `A homeowner has accepted your quote ${data.quoteReference}.`,
    ``,
    `Job: ${data.jobName}`,
    `Service: ${data.serviceType}`,
    `Signed by: ${data.signerName}`,
    `Accepted: ${acceptedFormatted}`,
    ``,
    `View the quote and signature here:`,
    data.dashboardUrl,
  ].join("\n");

  return {
    subject: `Quote accepted — ${data.quoteReference} signed by ${data.signerName}`,
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// Change Request Email
// ---------------------------------------------------------------------------
export function changeRequestEmail(data: ChangeRequestEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const submittedFormatted = formatDate(data.submittedAt);
  const displayName = data.contractorName || data.contractorEmail.split("@")[0];
  const from = data.requesterName ? data.requesterName : "A homeowner";

  const contactRows = [
    data.requesterName
      ? `<tr class="detail-row"><td class="detail-label">Name</td><td class="detail-value">${data.requesterName}</td></tr>`
      : "",
    data.requesterPhone
      ? `<tr class="detail-row"><td class="detail-label">Phone</td><td class="detail-value"><a href="tel:${data.requesterPhone}" style="color:#2563eb;">${data.requesterPhone}</a></td></tr>`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const html = emailBase(`
    <p class="greeting">Hi ${displayName},</p>
    <p style="font-size:15px;color:#334155;margin:0 0 8px;">
      ${from} has <strong>requested changes</strong> to one of your quotes before accepting it.
    </p>

    <div class="callout callout-warn">
      <p class="callout-label">Changes requested on</p>
      <p class="callout-value">${data.quoteReference}</p>
    </div>

    <table style="width:100%;border-collapse:collapse;margin:24px 0;">
      <tr class="detail-row">
        <td class="detail-label">Job</td>
        <td class="detail-value">${data.jobName}</td>
      </tr>
      <tr class="detail-row">
        <td class="detail-label">Service type</td>
        <td class="detail-value">${data.serviceType}</td>
      </tr>
      ${contactRows}
      <tr class="detail-row">
        <td class="detail-label">Submitted</td>
        <td class="detail-value">${submittedFormatted}</td>
      </tr>
    </table>

    <p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin:24px 0 8px;">
      Their message
    </p>
    <div class="message-box">${data.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>

    <p style="font-size:14px;color:#475569;margin:0 0 8px;">
      Review the request in your dashboard, update the quote, and share a new version with the homeowner.
    </p>

    <div class="cta-wrapper">
      <a href="${data.dashboardUrl}" class="cta-btn">View Quote &amp; Respond</a>
    </div>
  `);

  const text = [
    `Hi ${displayName},`,
    ``,
    `${from} has requested changes to quote ${data.quoteReference}.`,
    ``,
    `Job: ${data.jobName}`,
    `Service: ${data.serviceType}`,
    data.requesterName ? `Name: ${data.requesterName}` : "",
    data.requesterPhone ? `Phone: ${data.requesterPhone}` : "",
    `Submitted: ${submittedFormatted}`,
    ``,
    `Their message:`,
    data.message,
    ``,
    `View the quote and respond here:`,
    data.dashboardUrl,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  return {
    subject: `Changes requested — ${data.quoteReference} (${from})`,
    html,
    text,
  };
}

// ---------------------------------------------------------------------------
// Send Quote to Client Email (client-facing)
// ---------------------------------------------------------------------------
interface SendQuoteToClientEmailData {
  /** Optional client name — used in the greeting */
  clientName?: string | null;
  /** Contractor's display name */
  contractorName: string;
  /** Business name, falls back to contractor name */
  businessName?: string | null;
  /** Short quote reference, e.g. MQ-2025-0042 */
  quoteReference: string;
  /** Job title / description */
  jobName: string;
  /** Full shareable URL the client can open to review the quote */
  quoteUrl: string;
  /** Optional personal message from the contractor */
  personalNote?: string | null;
}

export function sendQuoteToClientEmail(data: SendQuoteToClientEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = data.clientName ? `Hi ${data.clientName},` : "Hi there,";
  const fromBusiness = data.businessName || data.contractorName;
  const safeNote = data.personalNote
    ? data.personalNote.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : null;

  const noteBlock = safeNote
    ? `<p style="font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#64748b;margin:24px 0 8px;">
        A note from ${fromBusiness}
      </p>
      <div class="message-box">${safeNote}</div>`
    : "";

  const plainNote = data.personalNote
    ? `\n---\nA note from ${fromBusiness}:\n${data.personalNote}\n---\n`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Quote from ${fromBusiness}</title>
  <style>
    body { margin: 0; padding: 0; background: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 32px auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; }
    .header { background: #1a3a5c; padding: 28px 32px; }
    .header-title { color: #ffffff; font-size: 18px; font-weight: 700; margin: 0; letter-spacing: -0.01em; }
    .header-sub { color: #94a3b8; font-size: 13px; margin: 4px 0 0; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; color: #1e293b; margin: 0 0 20px; }
    .callout { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px 24px; margin: 24px 0; }
    .callout-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 0 0 6px; }
    .callout-value { font-size: 18px; font-weight: 700; color: #0f172a; margin: 0; }
    .callout-sub { font-size: 13px; color: #475569; margin: 4px 0 0; }
    .cta-wrapper { text-align: center; margin: 32px 0 8px; }
    .cta-btn { display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600; padding: 14px 32px; border-radius: 10px; letter-spacing: -0.01em; }
    .message-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin: 16px 0; font-size: 14px; color: #334155; line-height: 1.6; white-space: pre-wrap; }
    .footer { background: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <p class="header-title">${fromBusiness}</p>
      <p class="header-sub">Powered by Mercurius Quote Tool</p>
    </div>
    <div class="body">
      <p class="greeting">${greeting}</p>
      <p style="font-size:15px;color:#334155;margin:0 0 8px;">
        ${fromBusiness} has prepared a <strong>quote</strong> for your review.
        Click the button below to view the full estimate, including pricing and job details.
      </p>

      <div class="callout">
        <p class="callout-label">Your quote</p>
        <p class="callout-value">${data.jobName}</p>
        <p class="callout-sub">Reference: ${data.quoteReference}</p>
      </div>

      ${noteBlock}

      <div class="cta-wrapper">
        <a href="${data.quoteUrl}" class="cta-btn">Review Your Quote</a>
      </div>

      <p style="font-size:13px;color:#94a3b8;text-align:center;margin:16px 0 0;">
        Or copy this link: <a href="${data.quoteUrl}" style="color:#2563eb;">${data.quoteUrl}</a>
      </p>
    </div>
    <div class="footer">
      This quote was sent by ${fromBusiness} using Mercurius Quote Tool.<br/>
      If you did not request this, you can safely ignore this email.
    </div>
  </div>
</body>
</html>`;

  const text = [
    greeting,
    ``,
    `${fromBusiness} has sent you a quote for: ${data.jobName}`,
    `Quote reference: ${data.quoteReference}`,
    plainNote,
    `Review your quote here:`,
    data.quoteUrl,
    ``,
    `—`,
    `Sent via Mercurius Quote Tool`,
  ].join("\n");

  return {
    subject: `Your quote from ${fromBusiness} — ${data.quoteReference}`,
    html,
    text,
  };
}
