const SHELL_OPEN = `<div style="margin:0;padding:0;background:#0b0b12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0b12;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#13131d;border:1px solid #23233140;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:32px 32px 8px 32px;">
          <div style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.02em;">Hammzy Digitals</div>
        </td></tr>
        <tr><td style="padding:8px 32px 32px 32px;color:#c7c7d1;font-size:15px;line-height:1.6;">`;

const SHELL_CLOSE = `        </td></tr>
        <tr><td style="padding:0 32px 32px 32px;color:#6b6b7b;font-size:12px;line-height:1.6;border-top:1px solid #23233130;padding-top:20px;">
          If you didn't request this, you can safely ignore this email.<br/>© 2026 Hammzy Digitals
        </td></tr>
      </table>
    </td></tr>
  </table>
</div>`;

export function render4DigitCodeEmail(code: string, link: string) {
  return `${SHELL_OPEN}
    <h1 style="margin:0 0 12px 0;font-size:22px;color:#ffffff;font-weight:700;">Verify your email</h1>
    <p style="margin:0 0 20px 0;">Enter this 4-digit code to finish creating your account. It expires in 15 minutes.</p>
    <div style="text-align:center;margin:8px 0 24px 0;">
      <div style="display:inline-block;font-size:36px;font-weight:800;letter-spacing:14px;color:#ffffff;background:#1c1c2a;border:1px solid #2a2a3d;border-radius:12px;padding:18px 28px 18px 42px;">${code}</div>
    </div>
    <div style="text-align:center;margin:0 0 8px 0;">
      <a href="${link}" style="display:inline-block;background:#6d5efc;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px;">Verify automatically</a>
    </div>
    <p style="margin:16px 0 0 0;font-size:13px;color:#9a9aa8;text-align:center;">Click the button to auto-fill the code, or copy it above and paste it on the verification page.</p>
${SHELL_CLOSE}`;
}

export function renderResetEmail(link: string) {
  return `${SHELL_OPEN}
    <h1 style="margin:0 0 12px 0;font-size:22px;color:#ffffff;font-weight:700;">Reset your password</h1>
    <p style="margin:0 0 20px 0;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 60 minutes.</p>
    <div style="text-align:center;margin:8px 0 8px 0;">
      <a href="${link}" style="display:inline-block;background:#6d5efc;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 26px;border-radius:10px;">Reset password</a>
    </div>
    <p style="margin:20px 0 0 0;font-size:13px;color:#9a9aa8;word-break:break-all;">Or paste this link in your browser:<br/>${link}</p>
${SHELL_CLOSE}`;
}