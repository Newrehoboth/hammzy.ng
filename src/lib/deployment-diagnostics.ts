type DiagnosticStatus = "ok" | "warning" | "error";

type DiagnosticCheck = {
  name: string;
  status: DiagnosticStatus;
  message: string;
};

type DiagnosticReport = {
  generatedAt: string;
  checks: DiagnosticCheck[];
};

function hasEnv(name: string): boolean {
  return typeof process !== "undefined" && Boolean(process.env?.[name]);
}

function addEnvCheck(checks: DiagnosticCheck[], name: string, required = true) {
  checks.push({
    name,
    status: hasEnv(name) ? "ok" : required ? "error" : "warning",
    message: hasEnv(name)
      ? "Set"
      : required
        ? `Missing ${name} in the deployment environment.`
        : `Missing optional ${name}; related features may not work.`,
  });
}

function sanitizeError(error: unknown): string {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return message
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-jwt]")
    .replace(/Bearer\s+[^\s<]+/gi, "Bearer [redacted]");
}

export async function getDeploymentDiagnostics(probeServerEntry = false): Promise<DiagnosticReport> {
  const checks: DiagnosticCheck[] = [];

  addEnvCheck(checks, "SUPABASE_URL");
  addEnvCheck(checks, "SUPABASE_PUBLISHABLE_KEY");
  addEnvCheck(checks, "SUPABASE_PROJECT_ID");
  addEnvCheck(checks, "VITE_SUPABASE_URL");
  addEnvCheck(checks, "VITE_SUPABASE_PUBLISHABLE_KEY");
  addEnvCheck(checks, "VITE_SUPABASE_PROJECT_ID");
  addEnvCheck(checks, "FIVESIM_API_KEY", false);

  const url = typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined;
  const key = typeof process !== "undefined" ? process.env?.SUPABASE_PUBLISHABLE_KEY : undefined;
  if (url && key) {
    try {
      const response = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
        headers: { apikey: key },
      });
      checks.push({
        name: "Backend connection",
        status: response.ok ? "ok" : "error",
        message: response.ok
          ? "Backend auth endpoint is reachable."
          : `Backend auth endpoint returned ${response.status}. Check SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY.`,
      });
    } catch (error) {
      checks.push({
        name: "Backend connection",
        status: "error",
        message: sanitizeError(error),
      });
    }
  }

  if (probeServerEntry) {
    try {
      await import("@tanstack/react-start/server-entry");
      checks.push({
        name: "App server import",
        status: "ok",
        message: "The app server bundle imports successfully.",
      });
    } catch (error) {
      checks.push({
        name: "App server import",
        status: "error",
        message: sanitizeError(error),
      });
    }
  }

  return { generatedAt: new Date().toISOString(), checks };
}

export function renderDiagnosticsPage(report: DiagnosticReport, probeServerEntry: boolean): string {
  const rows = report.checks
    .map(
      (check) => `<tr class="${check.status}"><td>${escapeHtml(check.name)}</td><td>${check.status.toUpperCase()}</td><td>${escapeHtml(check.message)}</td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Deployment diagnostics</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body { font: 14px/1.5 system-ui, -apple-system, sans-serif; background: #0b0f14; color: #e5e7eb; margin: 0; padding: 24px; }
      main { max-width: 980px; margin: 0 auto; }
      h1 { font-size: 24px; margin: 0 0 8px; }
      p { color: #9ca3af; margin: 0 0 20px; }
      table { width: 100%; border-collapse: collapse; background: #111827; border: 1px solid #263244; border-radius: 10px; overflow: hidden; }
      th, td { padding: 12px; border-bottom: 1px solid #263244; text-align: left; vertical-align: top; }
      th { color: #cbd5e1; background: #0f172a; }
      tr:last-child td { border-bottom: 0; }
      .ok td:nth-child(2) { color: #34d399; font-weight: 700; }
      .warning td:nth-child(2) { color: #fbbf24; font-weight: 700; }
      .error td:nth-child(2) { color: #fb7185; font-weight: 700; }
      .actions { display: flex; gap: 10px; flex-wrap: wrap; margin: 18px 0; }
      a { color: inherit; border: 1px solid #334155; border-radius: 8px; padding: 9px 12px; text-decoration: none; background: #111827; }
      code { background: #020617; padding: 2px 5px; border-radius: 5px; }
    </style>
  </head>
  <body>
    <main>
      <h1>Deployment diagnostics</h1>
      <p>Generated ${escapeHtml(report.generatedAt)}. This page only shows whether secrets exist, never their values.</p>
      <div class="actions">
        <a href="/__diagnostics?probe=1">Run app import check</a>
        <a href="/__diagnostics.json${probeServerEntry ? "?probe=1" : ""}">Open JSON</a>
        <a href="/">Open app</a>
      </div>
      <table>
        <thead><tr><th>Check</th><th>Status</th><th>Result</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top: 18px">If <code>App server import</code> fails, copy that row's message from Vercel and send it here.</p>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}