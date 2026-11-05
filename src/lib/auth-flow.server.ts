import { render4DigitCodeEmail, renderResetEmail } from "./email-templates.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM = "Hammzy Digitals <noreply@hammzy.ng>";

async function sendEmail(to: string, subject: string, html: string) {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const resendKey = process.env.RESEND_API_KEY;

  if (resendKey && lovableKey) {
    // Send via Lovable connector gateway
    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": resendKey,
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Failed to send email via Lovable Gateway (${res.status}): ${body}`);
    }
    return res.json();
  } else if (resendKey) {
    // Send directly using official Resend API
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({ from: FROM, to: [to], subject, html }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Failed to send email via Resend API (${res.status}): ${body}`);
    }
    return res.json();
  } else {
    throw new Error("Email service is not configured (RESEND_API_KEY is missing)");
  }
}

export async function sendVerificationCodeEmail(to: string, code: string, link: string) {
  return sendEmail(
    to,
    "Your Hammzy Digitals verification code",
    render4DigitCodeEmail(code, link),
  );
}

export async function sendPasswordResetEmail(to: string, link: string) {
  return sendEmail(to, "Reset your Hammzy Digitals password", renderResetEmail(link));
}