// =======================================================
// Boreal Financial Staff Server (Unified Entry Point)
// =======================================================

// 1️⃣ Load .env but don't override Replit Secrets
import dotenv from "dotenv";
dotenv.config({ override: false });
console.log(
  `✅ [ENV] Replit Secrets preserved. TWILIO_ACCOUNT_SID prefix: ${
    process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) || "NOT_SET"
  }`
);

// 2️⃣ Twilio + Secrets guards
import "./config/twilioGuard";
try {
  const { checkSecrets } = await import("./config/secretsGuard");
  checkSecrets();
} catch (e: any) {
  console.error("⚠️ [SecretsGuard] Failed:", e.message);
  console.error("⚠️ [SecretsGuard] Continuing; some features may not work");
}

// 3️⃣ Core imports
import express from "express";
import helmet from "helmet";
import cors from "cors";
import http from "http";
import { z } from "zod";

// Diagnostics utilities
import { attachRouteReporter } from "./_diag.routes.js";
import { attachDbDiag } from "./_diag.db.js";
import { runStartupDiagnostics } from "./_diag.startup.js"; // 🧩 Startup Diagnostics Reporter

// Middleware & APIs
import featuresApi from "./routes/api/features";
import { preCapture, postPersist } from "./middleware/losslessFieldCarriage";
import {
  apiRateLimit,
  authRateLimit,
  adminRateLimit,
  publicRateLimit,
} from "./middleware/rateLimiting";

// Auth middlewares
import { ensureJwt } from "./middleware/ensureJwt";
import { authJwt } from "./middleware/authJwt";

// Integration routes
import o365Routes from "./routes/integrations/office365";
import contactsRouter from "./routes/contacts";

// =======================================================
// Express Setup
// =======================================================
const app = express();
app.set("trust proxy", 1);

// --- Body parsers
app.use(
  express.json({
    limit: "5mb",
    strict: true,
    type: ["application/json", "application/csp-report"],
  })
);
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// =======================================================
// Security Headers
// =======================================================
app.use((req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
  } else {
    const frameAncestors = [
      "'self'",
      "https://staff.boreal.financial",
      "https://*.boreal.financial",
    ];
    const csp = [
      `default-src 'self'`,
      `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://sdk.twilio.com blob: data:`,
      `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com data:`,
      `img-src 'self' https: data: blob: https://www.google-analytics.com`,
      `font-src 'self' https://fonts.gstatic.com data:`,
      `connect-src 'self' https://sdk.twilio.com https://eventgw.twilio.com wss://eventgw.twilio.com wss://chunderw-vpc-gll.twilio.com wss://sdkgw.us1.twilio.com https://sdkgw.us1.twilio.com https://www.google-analytics.com`,
      `frame-src 'self' https://*.twilio.com https://accounts.google.com`,
      `frame-ancestors ${frameAncestors.join(" ")}`,
      `media-src 'self' blob: data:`,
      `object-src 'none'`,
      `base-uri 'self'`,
      `form-action 'self'`,
    ].join("; ");

    res.setHeader("Content-Security-Policy", csp);
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("X-XSS-Protection", "0");
  }
  next();
});

app.use(helmet({ contentSecurityPolicy: false }));

// =======================================================
// CORS Setup
// =======================================================
const allowlist = (process.env.ALLOW_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .concat(["https://replit.dev", "https://replit.com"]);

app.use(
  cors({
    origin: (origin, cb) =>
      cb(
        null,
        !origin || allowlist.includes(origin) || /\.replit\.dev$/.test(origin || "")
      ),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Authorization"],
    credentials: false,
  })
);
app.options("*", (_req, res) => res.sendStatus(200));

// =======================================================
// Core API Routes
// =======================================================

// Feature registry
app.use("/api/features", featuresApi);

// Application lossless middleware
app.use("/api/v1/applications", preCapture);
app.use("/api/v1/applications", postPersist);

// Contact system
app.use("/api/contacts", contactsRouter);

// Office 365 integrations
app.use("/api/o365", o365Routes);

// Small test APIs
app.get("/api/lenders", authJwt, (_req, res) =>
  res.json([{ id: "l-001", name: "Example Lender", status: "active" }])
);
app.get("/api/lender-products", authJwt, (_req, res) =>
  res.json([
    { id: "p-001", lenderId: "l-001", name: "Term Loan", aprMin: 6.99, aprMax: 15.99 },
  ])
);
app.get("/api/ads-analytics/overview", ensureJwt, (req, res) => {
  const q = z
    .object({ customerId: z.string().min(1).optional(), range: z.string().optional() })
    .parse(req.query);
  if (!q.customerId) return res.status(400).json({ error: "customerId required" });
  res.json({ connected: false, message: "Google Ads not connected" });
});

// =======================================================
// Rate Limiting
// =======================================================
app.use("/api/", apiRateLimit);
app.use("/api/auth/", authRateLimit);
app.use("/api/admin/", adminRateLimit);
app.use("/public/", publicRateLimit);

// =======================================================
// Diagnostics
// =======================================================
if (process.env.API_DIAG === "1") {
  attachRouteReporter(app);
  attachDbDiag(app);
  app.get("/api/_int/build", (_req, res) => {
    res.json({
      ok: true,
      status: "healthy",
      build_time: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      endpoints_active: true,
    });
  });
  console.log("🔧 [DIAG] Enabled: /api/_int/build, /api/_int/routes, /api/_int/db-sanity");
}

// =======================================================
// Twilio Environment Check
// =======================================================
app.get("/api/_int/twilio-check", (_req, res) => {
  res.json({
    TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY_SID: !!process.env.TWILIO_API_KEY_SID,
    TWILIO_API_KEY_SECRET: !!process.env.TWILIO_API_KEY_SECRET,
    TWILIO_TWIML_APP_SID: !!process.env.TWILIO_TWIML_APP_SID,
    TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
    account_prefix: process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) || "NOT_SET",
    twiml_app_prefix: process.env.TWILIO_TWIML_APP_SID?.substring(0, 8) || "NOT_SET",
  });
});

// =======================================================
// WebSocket (disabled in prod)
// =======================================================
const server = http.createServer(app);
const isProduction = process.env.NODE_ENV === "production";
const isDeployment = process.env.REPLIT_DEPLOYMENT === "true";
const isReplitEnv = process.env.REPL_ID !== undefined;
const isWebSocketDisabled = process.env.ENABLE_WS === "false";
const allowWebSocket = !isProduction && !isDeployment && !isReplitEnv && !isWebSocketDisabled;

if (allowWebSocket) {
  try {
    const { initializeWebSocketServer: initWS } = await import("./websocket");
    initWS(server);
    console.log("🔌 [WEBSOCKET] Enabled in dev");
  } catch (err) {
    console.log("🔌 [WEBSOCKET] Module not available:", err);
  }
} else {
  console.log("🔌 [WEBSOCKET] Disabled (prod/deploy env)");
}

// =======================================================
// Boot App Logic
// =======================================================
import boot from "./boot";
(async () => {
  await boot(app, server);
  await runStartupDiagnostics(app); // 🧩 runs DB/S3/Twilio health check + exposes /api/_int/db-health
})();

// =======================================================
// Final Server Listen
// =======================================================
if (!process.env._BOOTED_ONCE) {
  process.env._BOOTED_ONCE = "1";
  const PORT = Number(process.env.PORT) || 3001;
  const HOST = "0.0.0.0";

  server.listen(PORT, HOST, () => {
    console.log(`🚀 Boreal Staff Server running on http://${HOST}:${PORT}`);
    console.log("✅ Contacts table ready");
    console.log("🌐 External access enabled");
  });
} else {
  console.error("❌ Duplicate boot detected — refusing to start again.");
  process.exit(1);
}

export default server;
