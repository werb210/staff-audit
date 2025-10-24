cat > server/security/csp.ts <<'EOF'
import type { Request, Response, NextFunction } from "express";

const isProd = process.env.NODE_ENV === "production";

/**
 * Single source of truth for CSP. No meta tags, no other setters.
 * - Removes invalid tokens (there is NO 'unsafe-dynamic' in CSP)
 * - Moves reporting to its own directive (report-uri) instead of listing as a source
 * - Avoids paths/queries in source lists (not allowed by spec)
 */
export function csp(req: Request, res: Response, next: NextFunction) {
  const frameAncestors = isProd
    ? ["'self'", "https://staff.boreal.financial", "https://*.boreal.financial"]
    : ["'self'", "https://replit.com", "https://*.replit.com"];

  const policy = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://sdk.twilio.com blob:`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: https://www.google-analytics.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `connect-src 'self' https://*.replit.dev wss://*.twilio.com https://sdk.twilio.com https://www.google-analytics.com`,
    `frame-src 'self' https://*.twilio.com https://accounts.google.com`,
    `frame-ancestors ${frameAncestors.join(" ")}`,
    `report-uri /csp-report`,
  ].join("; ");

  res.setHeader("Content-Security-Policy", policy);
  next();
}

export function cspReportEndpoint(req: Request, res: Response) {
  try {
    if (!isProd) {
      console.warn("[CSP-REPORT]", JSON.stringify(req.body || {}, null, 2));
    }
  } catch {}
  res.status(204).end();
}

export const permissionsPolicy = [
  "geolocation=()",
  "camera=()",
  "microphone=()",
  "payment=()",
  "fullscreen=(self)",
  "publickey-credentials-get=(self)"
].join(", ");

export const corsAllowlist: (string | RegExp)[] = [
  "http://localhost:3000",
  "http://localhost:5000",
  /\.replit\.dev$/,
  /\.janeway\.replit\.dev$/,
  /\.picard\.replit\.dev$/,
];

export const iframeSandbox =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-downloads";
EOF
