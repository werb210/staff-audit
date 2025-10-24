import type { Request, Response, NextFunction } from "express";

const isProd = process.env.NODE_ENV === "production";

/**
 * Single source of truth for CSP. No meta tags, no other setters.
 * - Removes invalid tokens (there is NO 'unsafe-dynamic' in CSP)
 * - Moves reporting to its own directive (report-uri) instead of listing as a source
 * - Avoids paths/queries in source lists (not allowed by spec)
 */
export function csp(req: Request, res: Response, next: NextFunction) {
  // Allow Replit iframe to embed us in dev, and your domain in prod.
  const frameAncestors = isProd
    ? ["'self'", "https://staff.boreal.financial", "https://*.boreal.financial"]
    : ["'self'", "https://replit.com", "https://*.replit.com"];

  // Staff runs inside an iframe; keep it modest so features work without wildcards.
  const policy = [
    `default-src 'self'`,
    // Keep inline for Next/Vite dev and a few vendor origins explicitly listed.
    `script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://sdk.twilio.com blob:`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `img-src 'self' data: blob: https://www.google-analytics.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    // Replit preview uses *.replit.dev; Twilio needs wss + https.
    `connect-src 'self' https://*.replit.dev wss://*.twilio.com https://sdk.twilio.com https://www.google-analytics.com`,
    // If you open Twilio/Google auth popups or iframes, list them here:
    `frame-src 'self' https://*.twilio.com https://accounts.google.com`,
    `frame-ancestors ${frameAncestors.join(" ")}`,
    // Optional: turn on reporting (endpoint below).
    `report-uri /csp-report`,
  ].join("; ");

  res.setHeader("Content-Security-Policy", policy);
  next();
}

/** Accepts browser CSP violation reports (kept very light). */
export function cspReportEndpoint(req: Request, res: Response) {
  try {
    // Reports may come as application/csp-report or application/json
    // Do not log full body in prod; it's often PII-ish.
    if (!isProd) {
      // eslint-disable-next-line no-console
      console.warn("[CSP-REPORT]", JSON.stringify(req.body || {}, null, 2));
    }
  } catch {}
  res.status(204).end();
}

export const permissionsPolicy =
  // Only recognized tokens; remove the noisy ones from the console
  [
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

// Valid sandbox flags only
export const iframeSandbox =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-downloads";
