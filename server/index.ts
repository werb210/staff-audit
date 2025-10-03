// Load .env but don't override Replit Secrets
import dotenv from 'dotenv';
dotenv.config({ override: false });

console.log(`✅ [ENV] Replit Secrets preserved. TWILIO_ACCOUNT_SID prefix: ${process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) || 'NOT_SET'}`);

// 🔒 Enforce correct Twilio account before anything else
import "./config/twilioGuard";

// Run secrets guard on boot
try {
  const { checkSecrets } = await import("./config/secretsGuard");
  checkSecrets();
} catch (e: any) {
  console.error("⚠️  [SecretsGuard] Failed:", e.message);
  console.error("⚠️  [SecretsGuard] Server will continue but some features may not work");
}

import express from "express";
import helmet from "helmet";
import cors from "cors";
import http from "http";
// CSP configuration is now inline - security/csp removed
import { sessionStack, ensureAuth, loginUser, logoutUser } from "./auth/session";
import { z } from "zod";
// Conditionally import WebSocket only in development
let initializeWebSocketServer: any;
import { attachRouteReporter } from "./_diag.routes.js";
import { attachDbDiag } from "./_diag.db.js";
import featuresApi from "./routes/api/features";
import { preCapture, postPersist } from "./middleware/losslessFieldCarriage";
import { apiRateLimit, authRateLimit, adminRateLimit, publicRateLimit } from "./middleware/rateLimiting";

const app = express();
app.set("trust proxy", 1);

// --- Parsers FIRST
app.use(express.json({ limit: "2mb", strict: true, type: ["application/json","application/csp-report"] }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Skip most security headers in development to avoid blocking API calls
app.use((req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";
  
  if (!isProd) {
    // Development: NO CSP to prevent any blocking
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
  } else {
    // Production: Secure but functional CSP headers
    const frameAncestors = ["'self'", "https://staff.boreal.financial", "https://*.boreal.financial"];
    const policy = [
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
      `form-action 'self'`
    ].join("; ");
    
    res.setHeader("Content-Security-Policy", policy);
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("Origin-Agent-Cluster", "?1");
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    res.setHeader("X-DNS-Prefetch-Control", "off");
    res.setHeader("X-Download-Options", "noopen");
    res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    res.setHeader("X-XSS-Protection", "0");
  }
  next();
});
app.use(helmet({ contentSecurityPolicy: false }));

// --- CORS for JWT (no credentials)
const allowlist = (process.env.ALLOW_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean)
  .concat(["https://replit.dev", "https://replit.com"]);

app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowlist.includes(origin) || /\.replit\.dev$/.test(origin || "")),
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
  exposedHeaders: ["Authorization"],
  credentials: false,
}));
app.options("*", (_req,res)=>res.sendStatus(200));

// Sessions removed - using JWT authentication only

// DISABLED: Duplicate auth routes (correct implementation is in server/auth/routes.ts via boot.ts)
// import authRoutes from "./routes/auth";
// app.use("/api", authRoutes);

// CSP report receiver  
app.post("/csp-report", express.json({ type: ["application/json", "application/csp-report"] }), (req, res) => {
  try {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[CSP-REPORT]", JSON.stringify(req.body || {}, null, 2));
    }
  } catch {}
  res.status(204).end();
});

// Mount Feature Registry API AFTER parsers
app.use("/api/features", featuresApi);

// Lossless Field Carriage (pre + post) for create endpoint
app.use("/api/v1/applications", preCapture);
app.use("/api/v1/applications", postPersist);

// Add Vary header first
app.use((req, res, next) => { 
  res.setHeader("Vary", "Origin"); 
  next(); 
});

// Import JWT middleware
import { ensureJwt } from "./middleware/ensureJwt";

// Import JWT middleware
import { authJwt } from "./middleware/authJwt";

// --- Minimal APIs used by Settings/Lenders so pages don't 401/404 once logged in  
app.get("/api/lenders", authJwt, (_req, res) => res.json([{ id: "l-001", name: "Example Lender", status: "active" }]));
app.get("/api/lender-products", authJwt, (_req, res) => res.json([
  { id: "p-001", lenderId: "l-001", name: "Term Loan", aprMin: 6.99, aprMax: 15.99 }
]));
app.get("/api/ads-analytics/overview", ensureJwt, (req, res) => {
  const q = z.object({ customerId: z.string().min(1).optional(), range: z.string().optional() }).parse(req.query);
  if (!q.customerId) return res.status(400).json({ error: "customerId required" });
  res.json({ connected: false, message: "Google Ads not connected" });
});

// Apply rate limiting to API routes
app.use('/api/', apiRateLimit);
app.use('/api/auth/', authRateLimit);
app.use('/api/admin/', adminRateLimit);
app.use('/public/', publicRateLimit);

const server = http.createServer(app);

// COMPLETELY DISABLE WebSocket during any deployment or production context
const isProduction = process.env.NODE_ENV === 'production';
const isDeployment = process.env.REPLIT_DEPLOYMENT === 'true';
const isReplitEnvironment = process.env.REPL_ID !== undefined;
const isWebSocketDisabled = process.env.ENABLE_WS === 'false';

// Only allow WebSocket in pure development mode
const allowWebSocket = !isProduction && !isDeployment && !isReplitEnvironment && !isWebSocketDisabled;

if (allowWebSocket) {
  try {
    const { initializeWebSocketServer: initWS } = await import("./websocket");
    initWS(server);
    console.log("🔌 [WEBSOCKET] WebSocket server enabled in development mode");
  } catch (err) {
    console.log("🔌 [WEBSOCKET] WebSocket module not available:", err);
  }
} else {
  console.log("🔌 [WEBSOCKET] WebSocket DISABLED for deployment safety", {
    isProduction,
    isDeployment, 
    isReplitEnvironment,
    isWebSocketDisabled
  });
}

// Import and apply the rest of the application setup (includes auth setup)
import boot from "./boot";

// Use async IIFE to handle top-level await properly
(async () => {
  await boot(app, server);
})();

// Diagnostics (guarded by API_DIAG=1)
if (process.env.API_DIAG === "1") {
  attachRouteReporter(app);
  attachDbDiag(app);
  
  // Build health endpoint for smoke tests
  app.get("/api/_int/build", (req, res) => {
    res.json({
      ok: true,
      status: "healthy",
      build_time: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      endpoints_active: true
    });
  });
  
  console.log("🔧 [DIAG] Route and DB diagnostics enabled at /api/_int/routes and /api/_int/db-sanity");
  console.log("🔧 [DIAG] Build health endpoint enabled at /api/_int/build");
}

const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0'; // Bind to all interfaces for external access

server.listen(PORT, HOST, () => {
  console.log(`🚀 Enhanced Auth Server running on ${HOST}:${PORT}`);
  if (allowWebSocket) {
    console.log(`🔌 WebSocket server available on path /ws`);
  }
  console.log(`🌐 External access: Server now accessible from external connections`);
});

export default server;
// Twilio environment check endpoint
app.get('/api/_int/twilio-check', (req, res) => {
  res.json({
    TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY_SID: !!process.env.TWILIO_API_KEY_SID,
    TWILIO_API_KEY_SECRET: !!process.env.TWILIO_API_KEY_SECRET,
    TWILIO_TWIML_APP_SID: !!process.env.TWILIO_TWIML_APP_SID,
    TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
    // Show first 5 chars of Account SID for verification
    account_prefix: process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) || 'NOT_SET',
    twiml_app_prefix: process.env.TWILIO_TWIML_APP_SID?.substring(0, 8) || 'NOT_SET',
  });
});
