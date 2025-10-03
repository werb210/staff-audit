import type { Express } from "express";
import helmet from "helmet";
import cors, { CorsOptions } from "cors";

const isDev = process.env.NODE_ENV !== "production";

/** External services (keep tight & explicit) */
const GOOGLE = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://www.recaptcha.net",
  "https://www.google.com",
  "https://www.gstatic.com",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
];

const TWILIO = [
  "https://sdk.twilio.com",
  "https://media.twiliocdn.com",
  "https://static.twilio.com",
  "wss://*.twilio.com",
];

const REPLIT = [
  "https://*.replit.dev",
  "https://*.janeway.replit.dev",
  "https://*.picard.replit.dev",
];

export const iframeSandbox = "allow-scripts allow-same-origin"; // remove invalid flags elsewhere

/** Build a lean, standards-compliant CSP (no 'unsafe-dynamic', no query paths in sources) */
export function buildCsp(dev = isDev): string {
  const scriptInline = dev ? "'unsafe-inline'" : ""; // dev-only to quiet local inline snippets
  const styleInline  = dev ? "'unsafe-inline'" : ""; // prefer nonce/hashes in prod if needed

  return [
    "default-src 'self';",
    `script-src 'self' ${scriptInline} ${GOOGLE.join(" ")} ${TWILIO.slice(0,3).join(" ")};`,
    `style-src 'self' ${styleInline} https://fonts.googleapis.com;`,
    "font-src 'self' https://fonts.gstatic.com data:;",
    "img-src 'self' https: data: blob:;",
    `connect-src 'self' ${GOOGLE.join(" ")} ${TWILIO.join(" ")} ${REPLIT.join(" ")};`,
    "frame-src 'self' https://www.google.com https://www.recaptcha.net;",
    "frame-ancestors 'self';",
    "base-uri 'self';",
    "form-action 'self';",
    "object-src 'none';",
    "worker-src 'self' blob:;",
    "upgrade-insecure-requests;",
    // NOTE: 'report-uri' is its own directive, not a source inside default-src
    "report-uri /csp-report;"
  ].join(" ");
}

/** Keep Permissions-Policy to *supported* features only (prevents console spam) */
export function buildPermissionsPolicy(): string {
  return [
    "accelerometer=()",
    "autoplay=()",
    "camera=()",
    "display-capture=()",
    "fullscreen=*",
    "geolocation=()",
    "gyroscope=()",
    "microphone=()",
    "payment=()",
    "publickey-credentials-get=()",
    "screen-wake-lock=()",
  ].join(", ");
}

/** CORS allowlist (include your prod domains if not already present) */
export const corsAllowlist: (string|RegExp)[] = [
  // Production domains
  "https://staff.boreal.financial",
  "https://www.boreal.financial",
  "https://client.boreal.financial",
  
  // Local development
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5173",
  "http://127.0.0.1:5000",
  
  // Replit domains
  /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.replit\.app$/,
  /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.replit\.dev$/,
  /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.janeway\.replit\.dev$/,
  /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.picard\.replit\.dev$/,
  
  // Current instance
  "https://5b94728b-d7a4-4765-992e-926f94929109-00-3c18d2x352sp0.picard.replit.dev",
];

export function buildCorsOptions(): CorsOptions {
  return {
    origin(origin, cb) {
      if (!origin) return cb(null, true);
      const ok = corsAllowlist.some(v => v instanceof RegExp ? v.test(origin) : v === origin);
      return ok ? cb(null, true) : cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET","POST","PUT","DELETE","OPTIONS"],
    allowedHeaders: [
      "Content-Type","Authorization","X-Requested-With",
      "X-Trace-Id","X-App-Schema","X-App-Version","X-Admin-Token","X-Lender-Id","X-Request-ID"
    ],
    exposedHeaders: ["X-DB-Host","X-Instance"],
    maxAge: 600,
    optionsSuccessStatus: 204
  };
}

/** Single entry-point to apply all security headers/middleware */
export function applySecurity(app: Express) {
  app.use((req, res, next) => {
    // CSP is now set in server/index.ts - avoiding duplicate headers
    // res.setHeader("Content-Security-Policy", buildCsp());
    // res.setHeader("Permissions-Policy", buildPermissionsPolicy());
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    next();
  });

  // Keep helmet, but *disable* its own CSP (we set CSP above)
  app.use(helmet({ contentSecurityPolicy: false }));

  app.use(cors(buildCorsOptions()));
}