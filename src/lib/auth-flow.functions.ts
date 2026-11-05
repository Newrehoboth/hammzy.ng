import { createServerFn } from "@tanstack/react-start";

function gen4() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function normalizeOrigin(origin: string) {
  try {
    const u = new URL(origin);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "";
  }
}

// Send (or resend) a signup verification code to the user's email.
export const sendSignupCode = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; origin: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const origin = normalizeOrigin(data.origin);
    if (!email) throw new Error("Email is required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendVerificationCodeEmail } = await import("./auth-flow.server");

    const code = gen4();
    const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc("rpc_create_signup_code", {
      p_email: email,
      p_code: code,
      p_expires_at: expires_at,
    });

    if (rpcErr) throw rpcErr;

    const result = rpcData?.[0];
    if (!result) throw new Error("No account found for this email");
    if (result.already_verified) return { alreadyVerified: true };

    const link = `${origin}/verify-email?email=${encodeURIComponent(email)}&code=${code}`;
    await sendVerificationCodeEmail(result.profile_email || email, code, link);
    return { ok: true };
  });

// Verify the signup code and mark the profile verified.
export const verifySignupCode = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; code: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const code = data.code.trim();
    if (!/^\d{4}$/.test(code)) throw new Error("Enter the 4-digit code");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.rpc("rpc_verify_signup_code", {
      p_email: email,
      p_code: code,
    });

    if (error) {
      const msg = error.message || "Invalid or expired code";
      throw new Error(msg.replace("exception: ", ""));
    }

    return { ok: true };
  });

// Request a password reset link. Always returns ok to avoid leaking which emails exist.
export const requestPasswordReset = createServerFn({ method: "POST" })
  .inputValidator((d: { email: string; origin: string }) => d)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const origin = normalizeOrigin(data.origin);
    if (!email) throw new Error("Email is required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { sendPasswordResetEmail } = await import("./auth-flow.server");

    const expires_at = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc("rpc_create_reset_token", {
      p_email: email,
      p_expires_at: expires_at,
    });

    if (!rpcErr && rpcData && rpcData[0]) {
      const result = rpcData[0];
      const link = `${origin}/reset-password?token=${result.token}`;
      await sendPasswordResetEmail(result.profile_email || email, link);
    }

    return { ok: true };
  });

// Complete a password reset using a token from the email link.
export const resetPassword = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; password: string }) => d)
  .handler(async ({ data }) => {
    const token = data.token.trim();
    const password = data.password;
    if (!token) throw new Error("Invalid reset link");
    if (!password || password.length < 6) throw new Error("Password must be at least 6 characters");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.rpc("rpc_reset_password_with_token", {
      p_token: token,
      p_password: password,
    });

    if (error) {
      const msg = error.message || "This reset link is invalid or already used";
      throw new Error(msg.replace("exception: ", ""));
    }

    return { ok: true };
  });