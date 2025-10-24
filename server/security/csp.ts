import type { Express } from "express";
import helmet, { type IHelmetContentSecurityPolicyDirectives } from "helmet";

const GOOGLE = [
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
];

const TWILIO = [
  "https://sdk.twilio.com",
  "https://static.twilio.com",
  "https://media.twiliocdn.com",
  "wss://*.twilio.com",
];

const REPLIT = [
  "https://*.replit.dev",
  "https://*.janeway.replit.dev",
  "https://*.picard.replit.dev",
];

const PROD_FRAME_ANCESTORS = [
  "'self'",
  "https://staff.boreal.financial",
  "https://*.boreal.financial",
];

const DEV_FRAME_ANCESTORS = [
  "'self'",
  "https://replit.com",
  "https://*.replit.com",
];

const isProd = process.env.NODE_ENV === "production";

export function applyCSP(app: Express) {
  const directives: IHelmetContentSecurityPolicyDirectives = {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", ...GOOGLE, ...TWILIO.slice(0, 3)],
    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    imgSrc: ["'self'", "data:", "blob:", "https://www.google-analytics.com"],
    fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
    connectSrc: ["'self'", ...GOOGLE, ...TWILIO, ...REPLIT],
    frameSrc: ["'self'", "https://accounts.google.com", "https://*.twilio.com"],
    frameAncestors: isProd ? PROD_FRAME_ANCESTORS : DEV_FRAME_ANCESTORS,
    baseUri: ["'self'"],
    formAction: ["'self'"],
    objectSrc: ["'none'"],
    workerSrc: ["'self'", "blob:"],
    reportUri: ["/csp-report"],
  };

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives,
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    })
  );
}

export const permissionsPolicy = [
  "geolocation=()",
  "camera=()",
  "microphone=()",
  "payment=()",
  "fullscreen=(self)",
  "publickey-credentials-get=(self)",
].join(", ");

export const corsAllowlist: Array<string | RegExp> = [
  "https://staff.boreal.financial",
  "https://www.boreal.financial",
  "https://client.boreal.financial",
  "http://localhost:3000",
  "http://localhost:5000",
  "http://localhost:5173",
  "http://127.0.0.1:5000",
  /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.replit\.app$/,
  /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.replit\.dev$/,
  /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.janeway\.replit\.dev$/,
  /^https:\/\/[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]?\.picard\.replit\.dev$/,
  "https://5b94728b-d7a4-4765-992e-926f94929109-00-3c18d2x352sp0.picard.replit.dev",
];

export const iframeSandbox =
  "allow-scripts allow-same-origin allow-forms allow-popups allow-downloads";
