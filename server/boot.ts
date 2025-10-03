function requireRole(roles: string[]){return (req: any,res: any,next: any)=>{const u=req.session?.user; if(!u||!roles.includes(u.role||"")) return res.status(403).json({ok:false,error:"forbidden"}); next();};}
function __skipSharedToken(path: string){return (/^\/api\/(auth|session)/.test(path)||/^\/api\/(users|pipeline)/.test(path)||/^\/public\//.test(path)||/^\/api\/uploads\b/.test(path));}
import testDocsRouter from "./routes/test-docs.router";
import testIntakeRouter from "./routes/test-intake.router";
import contactsRouter from "./routes/contacts.router";
import marketingRouter from "./routes/marketing.router";
import reportsRouter from "./routes/reports.router";
import { traceIntake } from "./middleware/trace-intake";
function skipSharedToken(method: string,path: string){const pubGET = method==="GET" && (/^\/api\/uploads/.test(path)); return (/^\/api\/(auth|session|users|pipeline)/.test(path) || /^\/public\//.test(path) || pubGET);}
import productsRouter from "./routes/products.v1";
import './boot-logging.mjs';
import './config/env-guard.mjs';
// @ts-ignore
// import securityHardening from './security/hardening.mjs'; // REMOVED - using unified CSP in security.ts
// @ts-ignore
import requestId from './middleware/request-id.mjs';
import healthRoutes from './routes/health';
import diagProvenance from './middleware/diagProvenance';
import { traceId, logCanonicalMeta } from "./middleware/traceId";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { setupAuth } from "./auth/routes";
import { attachUserIfPresent, requireJwt, signJwt } from "./mw/jwt-auth";
import { authMiddleware } from "./mw/auth";
import { storage } from "./storage";
import { db } from "./db";
import { pool } from "./db";
import { sql } from "drizzle-orm";
// @ts-ignore
import userManagementRouter from "./routes/user-management.js";
// @ts-ignore
import crmDynamicRouter from "./routes/crm-dynamic.mjs";
// @ts-ignore
import catalogRouter from "./routes/catalog.mjs";
// @ts-ignore
import catalogSanityRouter from "./routes/catalog-sanity.mjs";
import mountAdminDupGuards from "./admin-guard-wire";
// @ts-ignore
import mountStatic from "./static-nocache.mjs";
import { assertUniqueRoutes } from "./middleware/assertUniqueRoutes";

// SINGLE CANONICAL IMPORTS (no duplicates)
// @ts-ignore
import catalogExport from "./routes/catalog-export.mjs";
// REMOVED: Legacy shim import (file deleted during cleanup)

// @ts-ignore - import.meta usage for __filename  
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { setupProductionLogging } from "./security/productionLogging";

export default async function boot(app: express.Express, server?: Server) {
  // Initialize production security measures
  setupProductionLogging();
  
  // Apply unified security configuration (CSP + Helmet)
  // REMOVED: broken security import - using canonical CSP in server/index.ts instead
  
  // Trace intake middleware (early mount for field mapping)
  app.use(traceIntake);
  
  // Enable trust proxy for accurate IP detection in rate limiting
  app.set('trust proxy', 1);
  
  // Request ID tracking (early mount)
  app.use(requestId());
  
  // Debug ALL incoming requests (early mount)
  app.use((req, res, next) => {
    console.log(`🌐 [REQUEST] ${req.method} ${req.url} from ${req.ip} - ${req.get('User-Agent')?.slice(0, 50) || 'no-ua'}`);
    next();
  });
  
  // CORS configuration is now handled in server/index.ts (mounted first)
  console.log("✅ CORS middleware applied for client app access");

  // JSON body parser (CRITICAL for POST requests)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(traceId);
  
  // Provenance diagnostics middleware (early mount, before routes)
  app.use(diagProvenance());
  
  // Health endpoints (early mount)
  app.use(healthRoutes());
  
  // Test endpoint (mounted VERY early to bypass all auth) - ROOT LEVEL
  try {
    const simpleTest = (await import("./routes/simple-test")).default;
    app.use("/", simpleTest);
  } catch (e: any) {
  }

  // E2E test router (mounted BEFORE auth middleware for test-only access)
  if (process.env.NODE_ENV!=="production") { app.use("/api/test", testIntakeRouter); }
if (process.env.NODE_ENV!=="production") { app.use("/api/test/docs", testDocsRouter); }
  
  // PUBLIC catalog endpoints (mount ONCE, BEFORE auth/JWT)
  app.use(catalogExport);
  // REMOVED: Legacy shim usage (file deleted during cleanup)

  // Mount PUBLIC APPLICATIONS router (for client integration)
  try {
    const publicApplications = (await import("./routes/public-applications")).default;
    app.use("/api/public", publicApplications);
  } catch (e: any) {
  }

  // Mount SECURE CHAT ROUTES for chatbot functionality
  try {
    const chatRoutes = (await import("./routes/chatRoutes-secure")).default;
    app.use("/api/public/chat", chatRoutes);
  } catch (e: any) {
  }

  // Mount Google Ads router BEFORE JWT middleware (needs to be public for OAuth)
  try {
    // @ts-ignore
    const googleAds = (await import("./routes/google-ads.mjs")).default;
    app.use(googleAds);
  } catch (e: any) {
  }

  // Mount catalog dedupe router BEFORE JWT middleware (public read-only)
  try {
    // @ts-ignore
    const catalogDedupe = (await import("./routes/catalog-dedupe.mjs")).default;
    app.use(catalogDedupe);
  } catch (e: any) {
    console.log("❌ Catalog dedupe router failed:", e.message);
  }

  // Mount direct DB fallback BEFORE JWT middleware (internal route)
  try {
    // @ts-ignore
    const rawProductsFallback = (await import("./routes/_int/raw-products-fallback.mjs")).default;
    app.use(rawProductsFallback);
  } catch (e: any) {
    console.log("❌ Raw products fallback failed:", e.message);
  }

  // Mount route dump introspection BEFORE JWT middleware
  try {
    // @ts-ignore
    const routeDump = (await import("./routes/_int/route-dump.mjs")).default;
    app.use(routeDump);
  } catch (e: any) {
    console.log("❌ Route dump failed:", e.message);
  }

  // Manual push to Client (Lenders tab button uses this)
  try {
    // @ts-ignore
    const pushProductsRouter = (await import("./routes/_admin/push-products.mjs")).default;
    app.use(pushProductsRouter);
  } catch (e: any) {
    console.log("❌ Admin push products router failed:", e.message);
  }

  // Mount geo check BEFORE JWT middleware (monitoring endpoint)
  try {
    // @ts-ignore
    const geoCheck = (await import("./routes/_int/geo-check.mjs")).default;
    app.use(geoCheck);
  } catch (e: any) {
    console.log("❌ Geo check failed:", e.message);
  }

  // DISABLED: v1 parity router (replaced by canonical products route)
  // try {
  //   const v1Parity = (await import("./routes/v1-parity.mjs")).default;
  //   app.use(v1Parity);
  // } catch (e) {
  //   console.log("❌ V1 parity router failed:", e.message);
  // }

  // Mount push-products router
  try {
    // @ts-ignore
    const pushProducts = (await import("./routes/push-products.mjs")).default;
    app.use(pushProducts);
  } catch (e: any) {
    console.log("❌ Push products failed:", e.message);
  }

  // Mount catalog-sanity router
  try {
    // @ts-ignore
    const catalogSanity = (await import("./routes/catalog-sanity.mjs")).default;
    app.use(catalogSanity);
  } catch (e: any) {
    console.log("❌ Catalog sanity failed:", e.message);
  }

  // DISABLED: Legacy lender-products shim - replaced with new lenders-api.ts
  // try {
  //   const lenderProductsShim = (await import("./routes/lender-products.mjs")).default;
  //   app.use(lenderProductsShim);
  // } catch (e) {
  //   console.log("❌ Lender products shim failed:", e.message);
  // }

  
  app.set("trust proxy", 1);

  // Static assets first - check both build locations
  const clientDirOptions = [
    path.resolve(process.cwd(), "dist/public"), // Vite build output
    path.resolve(process.cwd(), "client/dist")  // Fallback location
  ];
  const clientDir = process.env.FORCE_CLIENT_DIR || clientDirOptions.find(dir => {
    const indexPath = path.join(dir, "index.html");
    return fs.existsSync(indexPath);
  }) || clientDirOptions[0];
  const INDEX_HTML = path.join(clientDir, "index.html");
  
  // Debug: Log which directory we're serving from
  console.log("📁 Serving static files from:", clientDir);
  console.log("📁 Assets path:", path.join(clientDir, "assets"));
  console.log("📁 Assets exists:", fs.existsSync(path.join(clientDir, "assets")));
  
  // 🚨 CRITICAL: Custom root handler must run BEFORE any static middleware
  console.log("🔧 [BOOT] Installing custom root handler BEFORE static middleware...");
  app.get("/", (req, res) => {
    console.log(`🎯 [CUSTOM-ROOT] Intercepted GET / from ${req.ip}`);
    console.log(`🔍 [CUSTOM-ROOT] User-Agent: ${req.get('User-Agent')?.slice(0, 50)}`);
    
    // Check if index.html exists
    if (!fs.existsSync(INDEX_HTML)) {
      console.error("❌ INDEX_HTML not found:", INDEX_HTML);
      console.error("Available files in client dir:", fs.readdirSync(clientDir));
      return res.status(500).send("Application build not found");
    }
    
    console.log(`📄 [CUSTOM-ROOT] Serving clean HTML without modifications`);
    
    // AGGRESSIVE cache busting headers - NO HTML MODIFICATION
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');
    res.setHeader('X-Served-By', 'Boreal-Custom-Root-Handler');
    res.setHeader('X-Build-Time', new Date().toISOString());
    res.sendFile(INDEX_HTML);
  });

  // Serve static assets with proper paths
  app.use("/assets", express.static(path.join(clientDir, "assets")));
  app.use("/brand", express.static(path.join(clientDir, "brand")));
  
  // CRITICAL: Serve ALL static files from client directory root BUT exclude index.html
  app.use(express.static(clientDir, {
    index: false, // Don't serve index.html here (handled by custom route above)
    setHeaders: (res, path) => {
      if (path.endsWith('.css')) {
        res.setHeader('Content-Type', 'text/css');
        console.log(`📄 [CSS] Serving ${path}`);
      }
      if (path.endsWith('.js')) {
        res.setHeader('Content-Type', 'application/javascript');
        console.log(`📄 [JS] Serving ${path}`);
      }
    }
  }));
  
  // Serve staff hotfix CSS
  app.get("/__staff-hotfix.css", (_req, res) => {
    const fs = require("fs");
    const path = require("path");
    try {
      const css = fs.readFileSync(path.join(__dirname, "../public/staff-hotfix.css"), "utf8");
      res.type("text/css").send(css);
    } catch (e: any) {
      res.status(404).send("/* hotfix css not found */");
    }
  });
  
  // Also serve root static files with no-cache for HTML  
  app.use((req, res, next) => {
    if (req.method === "GET" && (req.path === "/" || req.path.endsWith(".html"))) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });
  
  // Enhanced static file serving with debugging and fallbacks - DISABLED for Vite dev server
  // mountStatic(app, clientDir);
  
  // TEMP FIX: Use static files in development due to Vite TypeScript issues
  // if (process.env.NODE_ENV !== "production" && server) {
  //   console.log("🔥 Setting up Vite dev server with HMR for automatic refresh...");
  //   const { setupVite } = await import("./vite");
  //   await setupVite(app, server);
  //   console.log("✅ Vite dev server with HMR enabled - code changes will auto-refresh");
  // } else {
    // Use static files for both dev and prod until Vite TypeScript issues are resolved
    console.log("📁 Using static file serving due to Vite dev server issues");
    mountStatic(app, clientDir);
  // }

  // Cookie parsing
  const cookieParser = (await import("cookie-parser")).default;
  app.use(cookieParser());

  // Session middleware - MOVED EARLIER for admin routes compatibility
  const session = (await import("express-session")).default;
  const pgSession = (await import("connect-pg-simple")).default(session);
  
  app.use(
    session({
      store: new pgSession({ pool: pool as any }),
      secret: process.env.SESSION_SECRET || "dev-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: { 
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      },
    })
  );

  // Request parsing
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Mount NEW production validator for client integration (shared token required)
  try {
    const { requireSharedToken } = await import("./middleware/requireSharedToken.js");
    const { applicationsValidateRouter } = await import("./routes/applications.validate.js");
    
    // Production validator with shared token auth (for client integration) - DISABLED to prevent conflicts
    // app.use("/api/applications/validate-intake", requireSharedToken, applicationsValidateRouter());
    // console.log("✅ Production validate-intake endpoint mounted (PRIORITY)");
  } catch (e: any) {
    console.log("❌ Production validate-intake endpoint failed:", e.message);
  }

  // DISABLED: Legacy application validation (replaced by production validator)
  // try {
  //   const appValidate = (await import("./routes/app-validate.mjs")).default;
  //   app.use("/api", appValidate);
  //   console.log("✅ Legacy application validation routes mounted under /api");
  // } catch (e) {
  //   console.log("❌ Legacy application validation failed:", e.message);
  // }

  try {
    // @ts-ignore
    const appSubmit = (await import("./routes/app-submit.mjs")).default;
    app.use(appSubmit);
  } catch (e: any) {
    console.log("❌ Application submit failed:", e.message);
  }

  // Mount simple application creation for E2E testing (public endpoint)
  try {
    const simpleAppCreate = (await import("./routes/simple-application-create")).default;
    app.use(simpleAppCreate);
  } catch (e: any) {
    console.log("❌ Simple application creation router failed:", e.message);
  }

  // Mount V1 Applications Documents API (DISABLED - replaced by unified V1 API)
  // try {
  //   const v1AppDocs = (await import("./routes/v1-applications-docs")).default;
  //   app.use(v1AppDocs);
  // } catch (e: any) {
  //   console.log("❌ V1 Applications Documents API failed:", e.message);
  // }

  // Mount Document Workflow routes (includes required-docs endpoint)
  try {
    const documentWorkflow = (await import("./routes/documentWorkflow")).default;
    app.use(documentWorkflow);
    console.log("✅ Document workflow routes mounted");
  } catch (e: any) {
    console.log("❌ Document workflow router failed:", e.message);
  }

  // Mount Upload routes BEFORE auth middleware for client access (DISABLED - conflicts with V1)
  // try {
  //   const uploadRoutes = (await import("./routes/upload")).default;
  //   app.use("/api/uploads", uploadRoutes);
  //   console.log("✅ Upload routes mounted at /api/uploads (BEFORE AUTH)");
  // } catch (e: any) {
  //   console.log("❌ Upload router failed:", e.message);
  // }

  // Add client app endpoint aliases BEFORE auth middleware
  app.get("/api/required-docs", (req, res) => {
    res.json({
      success: true,
      required_documents: [
        "Bank Statements (Last 6 months)",
        "Business License", 
        "Tax Returns (Last 2 years)",
        "Financial Statements"
      ]
    });
  });

  // Note: validate-intake endpoint is now handled by app-validate.mjs with shared token auth

  console.log("✅ Client app endpoint aliases added");

  // Mount v1 alias for validate-intake (back-compat only)
  try {
    const { requireSharedToken } = await import("./middleware/requireSharedToken.js");
    const { applicationsValidateRouter } = await import("./routes/applications.validate.js");
    
    // Back-compat alias: /api/v1/applications/validate-intake (with shared token)  
    app.use("/api/v1/applications/validate-intake", requireSharedToken, applicationsValidateRouter());
    
    console.log("✅ V1 alias validate-intake route mounted with shared token auth (BEFORE AUTH)");
  } catch (e: any) {
    console.log("❌ V1 alias validate-intake router failed:", e.message);
  }

  // REMOVED: Simple documents router (LEGACY) - Use V1 Applications Documents API instead

  // Mount client integration API routes (src/api)
  try {
    const srcApiMount = (await import("./routes/src-api-mount")).default;
    app.use(srcApiMount);
  } catch (e: any) {
    console.log("❌ Client integration API routes failed:", e.message);
  }

  // Mount aligned API endpoints for client-staff integration (public access) - DISABLED for ApplicationV1
  // try {
  //   const alignedApiRoutes = (await import("./routes/api-applications-aligned")).default;
  //   app.use("/api", alignedApiRoutes);
  // } catch (e: any) {
  //   console.log("❌ Aligned API endpoints failed:", e.message);
  // }

  // Also mount under /public/api for guaranteed public access - DISABLED for ApplicationV1
  // try {
  //   const alignedApiRoutesPublic = (await import("./routes/api-applications-aligned")).default;
  //   app.use("/public/api", alignedApiRoutesPublic);
  // } catch (e: any) {
  //   console.log("❌ Public aligned API endpoints failed:", e.message);
  // }

  // Mount public applications router under /api/public for client compatibility - DISABLED for ApplicationV1
  // try {
  //   const publicApplications = (await import("./routes/public-applications")).default;
  //   app.use("/api/public", publicApplications);
  // } catch (e: any) {
  //   console.log("❌ Client-expected public applications router failed:", e.message);
  // }

  // Authentication setup (mounts /api/auth/* routes WITHOUT shared token)
  setupAuth(app);

  // JWT middleware setup (for extracting user from tokens if present)
  app.use(attachUserIfPresent);

  // Mount applications router BEFORE auth middleware for public access
  try {
    const applicationsRouter = (await import("./routes/api/applications")).default;
    app.use("/api/applications", applicationsRouter);
    console.log("✅ Applications router mounted at /api/applications");
  } catch (e: any) { 
    console.log("❌ Applications router failed:", e.message);
  }

  // Mount applications presence router for integrity monitoring
  try {
    const applicationsPresenceRouter = (await import("./routes/api/applications.presence")).default;
    app.use("/api/applications", applicationsPresenceRouter);
    console.log("✅ Applications presence router mounted at /api/applications");
  } catch (e: any) { 
    console.log("❌ Applications presence router failed:", e.message);
  }

  // Mount CSRF token endpoint (required by client)
  try {
    const csrfRouter = (await import("./routes/csrf")).default;
    app.use("/api/csrf-token", csrfRouter);
    console.log("✅ CSRF token endpoint mounted at /api/csrf-token");
  } catch (e: any) {
    console.log("❌ CSRF router failed:", e.message);
  }

  // Mount V1 applications endpoint with validation (required by client)
  try {
    // Mount ApplicationV1 at /v1/applications as alias to /api/applications  
    const applicationsRouter = (await import("./routes/api/applications")).default;
    app.use("/api/v1/applications", applicationsRouter);
    console.log("✅ V1 applications alias mounted at /api/v1/applications");
  } catch (e: any) {
    console.log("❌ V1 applications alias failed:", e.message);
  }

  // Mount V1 applications presence router for integrity monitoring
  try {
    const applicationsPresenceRouter = (await import("./routes/api/applications.presence")).default;
    app.use("/api/v1/applications", applicationsPresenceRouter);
    console.log("✅ V1 applications presence router mounted at /api/v1/applications");
  } catch (e: any) {
    console.log("❌ V1 applications presence router failed:", e.message);
  }

  // Mount documents API router for document verification (PUBLIC ACCESS)
  try {
    const documentsApiRouter = (await import("./routes/api/documents")).default;
    app.use("/api", documentsApiRouter);
  } catch (e: any) {
    console.log("❌ Documents API router failed:", e.message);
  }

  // V1 Products API (canonical route)
  try {
    const { productsV1Router } = await import("./routes/products.v1");
    app.use("/api/v1/products", productsV1Router());
    console.log("✅ V1 products router mounted at /api/v1/products (BEFORE AUTH)");
  } catch (e: any) {
    console.log("❌ V1 products router failed:", e.message);
  }

  try {
    const lendersApiRouter = (await import("./routes/lenders-api")).default;
    app.use("/api", lendersApiRouter);
    console.log("✅ Lenders API router mounted (BEFORE AUTH)");
  } catch (e: any) {
    console.log("❌ Lenders API router failed:", e.message);
  }

  // Settings router (BEFORE AUTH for system stats)
  try {
    const settingsRouter = (await import("./routes/settings")).default;
    app.use("/api/settings", settingsRouter);
    console.log("✅ Settings router mounted at /api/settings (BEFORE AUTH)");
  } catch (e: any) { 
    console.log("❌ Settings router failed:", e.message); 
  }

  // Twilio router (BEFORE AUTH)
  try {
    const twilioRouter = (await import("./routes/twilio")).default;
    app.use("/api/twilio", twilioRouter);
    console.log("✅ Twilio router mounted at /api/twilio (BEFORE AUTH)");
    
    // Runtime guard: log Twilio account + Verify SID at boot
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_VERIFY_SERVICE_SID) {
      console.log(`[Twilio] Account: ${process.env.TWILIO_ACCOUNT_SID?.substring(0, 8)}...`);
      console.log(`[Twilio] Verify Service: ${process.env.TWILIO_VERIFY_SERVICE_SID?.substring(0, 8)}...`);
    } else {
      console.warn("[Twilio] ⚠️  Missing account or verify service env vars!");
    }
  } catch (e: any) { 
    console.log("❌ Twilio router failed:", e.message); 
  }

  // Sequences router (BEFORE AUTH)
  try {
    const sequencesRouter = (await import("./routes/sequences")).default;
    app.use("/api/sequences", sequencesRouter);
    console.log("✅ Sequences router mounted at /api/sequences (BEFORE AUTH)");
  } catch (e: any) { 
    console.log("❌ Sequences router failed:", e.message); 
  }


  // Lenders config router (BEFORE AUTH) 
  try {
    const lendersConfigRouter = (await import("./routes/lenders-config")).default;
    app.use("/api/lenders", lendersConfigRouter);
    console.log("✅ Lenders config router mounted at /api/lenders (BEFORE AUTH)");
  } catch (e: any) { 
    console.log("❌ Lenders config router failed:", e.message); 
  }

  // Documents config router (BEFORE AUTH)
  try {
    const documentsConfigRouter = (await import("./routes/documents-config")).default;
    app.use("/api/documents", documentsConfigRouter);
    console.log("✅ Documents config router mounted at /api/documents (BEFORE AUTH)");
  } catch (e: any) { 
    console.log("❌ Documents config router failed:", e.message); 
  }

  // Security config router (BEFORE AUTH)
  try {
    const securityConfigRouter = (await import("./routes/security-config")).default;
    app.use("/api/security", securityConfigRouter);
    console.log("✅ Security config router mounted at /api/security (BEFORE AUTH)");
  } catch (e: any) { 
    console.log("❌ Security config router failed:", e.message); 
  }

  // Dev stubs to prevent 404 spam (BEFORE AUTH) - must be FIRST
  try {
    const devStubs = (await import("./routes/dev-stubs")).default;
    app.use("/api", devStubs);
    console.log("✅ Dev stubs router mounted at /api (BEFORE AUTH)");
  } catch (e: any) { 
    console.log("❌ Dev stubs router failed:", e.message); 
  }


  // Apply authMiddleware to staff-only routes (protected after login)
  console.log("🔧 [OIB] Applying authMiddleware to staff-protected routes");
  app.use("/api", (req, res, next) => {
    // Skip auth middleware for public/client endpoints and auth routes
    const fullPath = req.originalUrl || req.url;
    if (fullPath.includes('/api/v1/products') || 
        fullPath.includes('/api/lenders') || 
        fullPath.includes('/api/required-docs') ||
        fullPath.includes('/api/_int/state') ||
        fullPath.includes('/api/applications/validate-intake') ||
        fullPath.includes('/api/v1/applications') ||
        fullPath.includes('/api/csrf-token') ||
        fullPath.includes('/api/auth/') ||
        fullPath.includes('/api/session/') ||
        fullPath.includes('/api/uploads/') ||
        fullPath.includes('/api/public/') ||
        fullPath.includes('/api/pipeline') ||
        fullPath.includes('/api/cards') ||
        fullPath.includes('/api/dashboard/') ||
        fullPath.includes('/api/apps') ||
        fullPath.includes('/api/user-management') ||
        fullPath.includes('/api/settings/') ||
        fullPath.includes('/api/twilio/') ||
        fullPath.includes('/api/lenders/') ||
        fullPath.includes('/api/documents/') ||
        fullPath.includes('/api/security/') ||
        fullPath.includes('/api/calendar/') ||
        fullPath.includes('/api/tasks') ||
        fullPath.includes('/api/reports/') ||
        fullPath.includes('/api/marketing/') ||
        fullPath.includes('/api/ads/') ||
        fullPath.includes('/api/dialer/') ||
        fullPath.includes('/api/email') ||
        fullPath.includes('/api/sms') ||
        fullPath.includes('/api/crm') ||
        fullPath.includes('/api/office365') ||
        fullPath.includes('/api/ai/') ||
        fullPath.includes('/api/ocr') ||
        fullPath.includes('/api/audit') ||
        fullPath.includes('/api/retry-queue') ||
        fullPath.includes('/api/pdf/') ||
        fullPath.includes('/api/comms/') ||
        fullPath.includes('/api/_int/')) {
      console.log(`✅ [MIDDLEWARE-BYPASS] Skipping authMiddleware for: ${fullPath}`);
      return next();
    }
    // Apply auth middleware to staff routes
    authMiddleware(req, res, next);
  });

  // PROTECTED ROUTES (after JWT middleware)
  app.use("/api", userManagementRouter);
  app.use("/api", crmDynamicRouter);
  app.use("/api", catalogRouter);
  app.use("/api", catalogSanityRouter);

  // Import protected routes
  try {
    const { contactsRouter } = await import("./routes/contacts");
    app.use("/api/contacts", contactsRouter);
    console.log("✅ Contacts router mounted at /api/contacts");
  } catch (e: any) { 
    console.log("❌ contacts.ts import failed:", e.message); 
  }

  try {
    const dashboardRouter = (await import("./routes/dashboard")).default;
    app.use("/api/dashboard", dashboardRouter);
    console.log("✅ Dashboard router mounted at /api/dashboard");
  } catch (e: any) { console.log("❌ Dashboard router failed:", e.message); }


  try {
    const voiceRouter = (await import("./routes/voice")).default;
    app.use("/api/voice", voiceRouter);
  } catch (e: any) { console.log("voice.ts not found"); }

  // Duplicate detection systems
  try {
    const diagDupes = (await import("./routes/diag.dupes")).default;
    app.use("/api", diagDupes);
  } catch (e: any) { console.log("diag.dupes.ts not found"); }

  // REMOVED: Duplicate contacts router - contactsDedup merged into main contacts.ts

  try {
    const duplicateOverride = (await import("./routes/admin/duplicateOverride")).default;
    app.use("/api/admin", duplicateOverride);
  } catch (e: any) { console.log("duplicateOverride.ts not found"); }

  // Core API endpoints for cards
  // Mount main users API (not admin users)
  try {
    const usersRouter = (await import("./routes/users-api")).default;
    app.use("/api", usersRouter);
    console.log("✅ Users API router mounted at /api/users");
  } catch (e: any) { 
    console.log("❌ users-api.ts not found:", e.message); 
  }

  // Also mount admin users separately  
  try {
    const adminUsersRouter = (await import("./routes/admin/users")).default;
    app.use(adminUsersRouter);  // Admin routes already include /api/admin prefix
    console.log("✅ Admin users router mounted at /api/admin/users");
  } catch (e: any) { 
    console.log("❌ admin/users.ts not found:", e.message); 
  }

  // DISABLED: Conflicts with ApplicationV1 handler
  // try {
  //   const applicationsRouter = (await import("./routes/applications-minimal")).default;
  //   app.use("/api", applicationsRouter);
  // } catch (e: any) { console.log("applications-minimal.ts not found"); }

  // DUPLICATE REMOVED - contacts router already mounted above at line 370

  // REMOVED: Lenders API already mounted before auth middleware


  // Admin routes (early mount to prevent conflicts)
  mountAdminDupGuards(app);

  // Import existing routes only
  try {
    // @ts-ignore
    const staffContactsRouter = (await import("./routes/staff-contacts.mjs")).default;
    app.use("/api", staffContactsRouter);
  } catch (e: any) { console.log("staff-contacts.mjs not found"); }

  // Staff Lender Products Router - REQUIRED for staff app API access
  try {
    const staffLenderProductsRouter = (await import("./routes/staffLenderProducts")).default;
    app.use("/api/staff", staffLenderProductsRouter);
    console.log("✅ Staff lender products router mounted at /api/staff");
  } catch (e: any) { 
    console.log("❌ Staff lender products router failed:", e.message); 
  }


  // Mount Lookup router for Twilio phone lookups
  try {
    const lookupRouter = (await import("./routes/lookup")).default;
    app.use("/api/lookup", lookupRouter);
    console.log("✅ Lookup router mounted at /api/lookup");
  } catch (e: any) { 
    console.log("❌ Lookup router failed:", e.message); 
  }

  // Mount Apps router for application drawer data
  try {
    const appsRouter = (await import("./routes/apps")).default;
    app.use("/api/apps", appsRouter);
    console.log("✅ Apps router mounted at /api/apps");
  } catch (e: any) { 
    console.log("❌ Apps router failed:", e.message); 
  }


  // Mount User Management API router (fixing 404)
  try {
    const userManagementApiRouter = (await import("./routes/user-management-api")).default;
    app.use("/api/user-management", userManagementApiRouter);
    console.log("✅ User Management API router mounted at /api/user-management");
  } catch (e: any) { 
    console.log("❌ User Management API router failed:", e.message); 
  }

  try {
    const analyticsRouter = (await import("./routes/analytics")).default;
    app.use("/api", analyticsRouter);
  } catch (e: any) { console.log("analytics.mjs not found"); }

  try {
    // @ts-ignore
    const applicationDetailRouter = (await import("./routes/application-detail.mjs")).default;
    app.use("/api", applicationDetailRouter);
  } catch (e: any) { console.log("application-detail.mjs not found"); }

  // REMOVED: Dialer router moved to BEFORE AUTH section

  try {
    const marketingRouter = (await import("./routes/marketing")).default;
    app.use("/api", marketingRouter);
  } catch (e: any) { console.log("marketing.mjs not found"); }

  try {
    // @ts-ignore
    const aiHelpersRouter = (await import("./routes/ai-helpers.mjs")).default;
    app.use("/api", aiHelpersRouter);
  } catch (e: any) { console.log("ai-helpers.mjs not found"); }

  // REMOVED: Conflicting lenders.mjs import - using canonical lenders-api.ts

  // REMOVED: SLF contacts integrated into main contacts router with silo filtering

  try {
    const voiceRouter = (await import("./routes/voice")).default;
    app.use("/api", voiceRouter);
  } catch (e: any) { console.log("voice.mjs not found"); }

  try {
    const notificationsRouter = (await import("./routes/notifications")).default;
    app.use("/api", notificationsRouter);
  } catch (e: any) { console.log("notifications.mjs not found"); }

  // Allow pipeline endpoints (before auth middleware) - skip auth completely
  app.use('/api/pipeline', (req, res, next) => {
    console.log(`🔓 [PIPELINE-BYPASS] Bypassing auth for: ${req.path}`);
    (req as any).skipAuth = true;
    next();
  });
  
  // Also bypass auth for the mounted card routes
  app.use('/api/cards', (req, res, next) => {
    console.log(`🔓 [CARDS-BYPASS] Bypassing auth for: ${req.path}`);
    (req as any).skipAuth = true;
    next();
  });
  
  try {
    const pipelineRouter = (await import('./routes/pipeline')).default;
    app.use('/api/pipeline', pipelineRouter);
    console.log("✅ Pipeline router mounted at /api/pipeline");
  } catch (e: any) { 
    console.log("❌ Pipeline router failed:", e.message); 
  }

  try {
    // @ts-ignore
    const hubspotRouter = (await import("./routes/hubspot.mjs")).default;
    app.use("/api", hubspotRouter);
  } catch (e: any) { console.log("hubspot.mjs not found"); }

  try {
    // @ts-ignore
    const globalSearchRouter = (await import("./routes/global-search.mjs")).default;
    app.use("/api", globalSearchRouter);
  } catch (e: any) { console.log("global-search.mjs not found"); }

  try {
    // @ts-ignore
    const billingRouter = (await import("./routes/billing.mjs")).default;
    app.use("/api", billingRouter);
  } catch (e: any) { console.log("billing.mjs not found"); }

  try {
    // @ts-ignore
    const featureFlagsRouter = (await import("./routes/feature-flags.mjs")).default;
    app.use("/api", featureFlagsRouter);
  } catch (e: any) { console.log("feature-flags.mjs not found"); }

  try {
    // @ts-ignore
    const buildGuardRouter = (await import("./routes/build-guard.mjs")).default;
    app.use("/api", buildGuardRouter);
  } catch (e: any) { console.log("build-guard.mjs not found"); }

  // Admin catalog normalization endpoints
  try {
    // @ts-ignore
    const adminCatalog = (await import("./routes/_admin-catalog.mjs")).default;
    app.use(adminCatalog);
    console.log("✅ Admin catalog router mounted");
  } catch (e: any) {
    console.log("❌ Admin catalog failed:", e.message);
  }


  // Mount Credit Summary AI router (CRITICAL FIX)  
  try {
    const creditSummaryRouter = (await import("./routes/ai-features")).default;
    app.use("/api/ai", creditSummaryRouter);
    console.log("✅ AI Credit Summary router mounted at /api/ai");
  } catch (e: any) {
    console.log("❌ AI Credit Summary router failed:", e.message);
  }

  // Mount OCR Insights router (CRITICAL FIX)
  try {
    const ocrInsightsRouter = (await import("./routes/ocrInsights")).default;
    app.use("/api/ocr-insights", ocrInsightsRouter);
    console.log("✅ OCR Insights router mounted at /api/ocr-insights");
  } catch (e: any) {
    console.log("❌ OCR Insights router failed:", e.message);
  }

  // Mount Banking Analysis router (CRITICAL FIX)
  try {
    const bankingRouter = (await import("./routes/banking")).default;
    app.use("/api/banking", bankingRouter);
    console.log("✅ Banking Analysis router mounted at /api/banking");
  } catch (e: any) {
    console.log("❌ Banking Analysis router failed:", e.message);
  }

  // Mount Communications router (CRITICAL FIX #3)
  try {
    const commsRouter = (await import("./routes/comms")).default;
    app.use("/api/comms", commsRouter);
    console.log("✅ Communications router mounted at /api/comms");
  } catch (e: any) {
    console.log("❌ Communications router failed:", e.message);
  }

  // Mount AI Document Analysis router (CRITICAL FIX #4)
  try {
    const aiDocAnalysisRouter = (await import("./routes/ai/documentAnalysis")).default;
    app.use("/api/ai", aiDocAnalysisRouter);
    console.log("✅ AI Document Analysis router mounted at /api/ai");
  } catch (e: any) {
    console.log("❌ AI Document Analysis router failed:", e.message);
  }

  // Mount PDF Generation router (CRITICAL FIX #2)
  try {
    const pdfGenRouter = (await import("./routes/pdf-generation")).default;
    app.use("/api/pdf", pdfGenRouter);
    console.log("✅ PDF Generation router mounted at /api/pdf");
  } catch (e: any) {
    console.log("❌ PDF Generation router failed:", e.message);
  }

  // Debug trace endpoint for field lineage lookup (BEFORE SPA fallback)
  if (process.env.NODE_ENV!=="production") { app.get("/debug/trace/:id", (req, res) => {
    const base = path.join(process.cwd(), "reports", "staff-trace-live", req.params.id);
    try {
      const incoming = JSON.parse(fs.readFileSync(path.join(base, "incoming.json"), "utf8"));
      const card = JSON.parse(fs.readFileSync(path.join(base, "card.json"), "utf8"));
      const map = JSON.parse(fs.readFileSync(path.join(base, "map.json"), "utf8"));
      res.json({ ok: true, incoming, card, map });
    } catch (e: any) {
      res.status(404).json({ ok: false, error: "not_found", hint: base });
    }
  }); }

  // Mount devBypass BEFORE catch-all to prevent override
  try {
    const { installDevAuthBypass } = await import('./middleware/devBypass');
    console.log('🔧 [BOOT] Installing devBypass before catch-all...');
    installDevAuthBypass(app);
    console.log('✅ [BOOT] DevBypass installed successfully');
  } catch (error) {
    console.error('❌ [BOOT] DevBypass installation failed:', error);
  }

  // DEVELOPMENT: Add API route protection AFTER all routes are mounted
  if (process.env.NODE_ENV !== "production") {
    // Catch unhandled API routes and return JSON 404s instead of HTML
    app.use('/api/*', (req, res, next) => {
      if (res.headersSent) return next();
      res.status(404).json({ error: `API endpoint not found: ${req.path}` });
    });
    console.log('✅ [BOOT] API route protection installed - unhandled API routes return JSON');
  }

  // SPA fallback (serves index.html for all non-API routes)
  console.log(`📁 [SPA] Client directory: ${clientDir}`);
  console.log(`📄 [SPA] Index.html path: ${INDEX_HTML}`);
  console.log(`📄 [SPA] Index.html exists: ${fs.existsSync(INDEX_HTML)}`);
  // 🛡️ RUNTIME SAFEGUARDS: Verify no critical route duplicates
  try {
    assertUniqueRoutes(app, [
      "/api/auth/session", "/api/voice/token", "/api/tasks", 
      "/api/calendar", "/api/user-management", "/api/pipeline"
    ]);
  } catch (error: any) {
    console.error("❌ CRITICAL: Route duplication detected!", error.message);
    process.exit(1);
  }
  

  // SPA fallback for both development and production (since we're using static serving)
  // CRITICAL: Only catch routes that are NOT assets or API endpoints
  app.get("*", (req, res, next) => {
    // Skip if it's an API route
    if (req.path.startsWith("/api/")) {
      return res.status(404).json({ error: "API endpoint not found" });
    }
    
    // Skip if it's a static asset (has file extension or starts with /assets/ or /brand/)
    if (req.path.startsWith("/assets/") || req.path.startsWith("/brand/") || /\.[a-zA-Z0-9]+$/.test(req.path)) {
      console.log(`⚠️ [SPA-SKIP] Not a SPA route, skipping fallback for: ${req.path}`);
      return next(); // Let static middleware or 404 handle it
    }
    
    // Check if index.html exists
    if (!fs.existsSync(INDEX_HTML)) {
      console.error("❌ INDEX_HTML not found:", INDEX_HTML);
      console.error("Available files in client dir:", fs.readdirSync(clientDir));
      return res.status(500).send("Application build not found");
    }
    
    console.log(`📄 Serving SPA fallback for: ${req.path}`);
    // AGGRESSIVE cache busting headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '-1');
    res.setHeader('X-Build-Time', new Date().toISOString());
    res.sendFile(INDEX_HTML);
  });


  console.log('🌐 External access: Server now accessible from external connections');

  // Initialize LinkedIn Scheduler
  try {
    const { initLinkedInScheduler } = await import("./jobs/linkedinScheduler");
    initLinkedInScheduler();
  } catch (e: any) {
    console.log("❌ LinkedIn scheduler failed:", e.message);
  }
}
