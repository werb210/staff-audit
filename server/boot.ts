```ts
// server/boot.ts

// Core
import express from "express";
import type { Server } from "http";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

// Env / logging / guards
import "./boot-logging.mjs";
import "./config/env-guard.mjs";
import { setupProductionLogging } from "./security/productionLogging";

// Tracing & diagnostics
import requestId from "./middleware/request-id.mjs"; // @ts-ignore
import { traceIntake } from "./middleware/trace-intake";
import diagProvenance from "./middleware/diagProvenance";
import { traceId } from "./middleware/traceId";
import healthRoutes from "./routes/health";
import { assertUniqueRoutes } from "./middleware/assertUniqueRoutes";

// Auth
import { setupAuth } from "./auth/routes";
import { attachUserIfPresent } from "./mw/jwt-auth";
import { authMiddleware } from "./mw/auth";

// Static helper
import mountStatic from "./static-nocache.mjs"; // @ts-ignore

// “One true” route aggregator (e.g., /api/o365 etc.)
import routes from "./routes";

// Legacy/public routers mounted early
import catalogExport from "./routes/catalog-export.mjs"; // @ts-ignore

// Node globals for ESM
// @ts-ignore - import.meta usage for __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function boot(app: express.Express, server?: Server) {
  // --- Security & basic app config
  setupProductionLogging();
  app.set("trust proxy", 1);

  // --- Very-early middleware
  app.use(traceIntake);
  app.use(requestId());
  app.use((req, _res, next) => {
    console.log(`🌐 [REQUEST] ${req.method} ${req.url} from ${req.ip} - ${req.get("User-Agent")?.slice(0, 50) || "no-ua"}`);
    next();
  });

  // --- Parsers (single place)
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));
  app.use(traceId);

  // --- Diagnostics & health
  app.use(diagProvenance());
  app.use(healthRoutes());

  // --- Central API router (mount shared/feature routers, e.g., /api/o365)
  app.use("/api", routes);

  // --- Public endpoints BEFORE any auth/JWT
  app.use(catalogExport);

  try {
    const simpleTest = (await import("./routes/simple-test")).default;
    app.use("/", simpleTest);
  } catch {}

  if (process.env.NODE_ENV !== "production") {
    try {
      const testIntakeRouter = (await import("./routes/test-intake.router")).default;
      app.use("/api/test", testIntakeRouter);
      const testDocsRouter = (await import("./routes/test-docs.router")).default;
      app.use("/api/test/docs", testDocsRouter);
    } catch {}
  }

  try {
    const googleAds = (await import("./routes/google-ads.mjs")).default; // @ts-ignore
    app.use(googleAds);
  } catch {}

  try {
    const catalogDedupe = (await import("./routes/catalog-dedupe.mjs")).default; // @ts-ignore
    app.use(catalogDedupe);
  } catch (e: any) {
    console.log("❌ Catalog dedupe router failed:", e.message);
  }

  try {
    const rawProductsFallback = (await import("./routes/_int/raw-products-fallback.mjs")).default; // @ts-ignore
    app.use(rawProductsFallback);
  } catch (e: any) {
    console.log("❌ Raw products fallback failed:", e.message);
  }

  try {
    const routeDump = (await import("./routes/_int/route-dump.mjs")).default; // @ts-ignore
    app.use(routeDump);
  } catch (e: any) {
    console.log("❌ Route dump failed:", e.message);
  }

  try {
    const pushProductsRouter = (await import("./routes/_admin/push-products.mjs")).default; // @ts-ignore
    app.use(pushProductsRouter);
  } catch (e: any) {
    console.log("❌ Admin push products router failed:", e.message);
  }

  try {
    const geoCheck = (await import("./routes/_int/geo-check.mjs")).default; // @ts-ignore
    app.use(geoCheck);
  } catch (e: any) {
    console.log("❌ Geo check failed:", e.message);
  }

  // --- Static client hosting (dist/public or client/dist)
  const clientDirOptions = [
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(process.cwd(), "client/dist"),
  ];
  const clientDir =
    process.env.FORCE_CLIENT_DIR ||
    clientDirOptions.find((dir) => fs.existsSync(path.join(dir, "index.html"))) ||
    clientDirOptions[0];
  const INDEX_HTML = path.join(clientDir, "index.html");

  console.log("📁 Serving static from:", clientDir);

  // Root handler BEFORE static
  app.get("/", (_req, res) => {
    if (!fs.existsSync(INDEX_HTML)) return res.status(500).send("Application build not found");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "-1");
    res.setHeader("X-Served-By", "Boreal-Custom-Root-Handler");
    res.setHeader("X-Build-Time", new Date().toISOString());
    res.sendFile(INDEX_HTML);
  });

  app.use("/assets", express.static(path.join(clientDir, "assets")));
  app.use("/brand", express.static(path.join(clientDir, "brand")));
  app.use(
    express.static(clientDir, {
      index: false,
      setHeaders: (res, p) => {
        if (p.endsWith(".css")) res.setHeader("Content-Type", "text/css");
        if (p.endsWith(".js")) res.setHeader("Content-Type", "application/javascript");
      },
    })
  );

  app.get("/__staff-hotfix.css", (_req, res) => {
    try {
      const css = fs.readFileSync(path.join(__dirname, "../public/staff-hotfix.css"), "utf8");
      res.type("text/css").send(css);
    } catch {
      res.status(404).send("/* hotfix css not found */");
    }
  });

  app.use((req, res, next) => {
    if (req.method === "GET" && (req.path === "/" || req.path.endsWith(".html"))) {
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
    }
    next();
  });

  // Keep using file-static (no Vite HMR in this env)
  mountStatic(app, clientDir);

  // --- Cookies & session
  const cookieParser = (await import("cookie-parser")).default;
  app.use(cookieParser());

  const session = (await import("express-session")).default;
  const pgSession = (await import("connect-pg-simple")).default(session);
  const { pool } = await import("./db");

  app.use(
    session({
      store: new pgSession({ pool: pool as any }),
      secret: process.env.SESSION_SECRET || "dev-secret-key",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  // --- Public helpers & aliases
  app.get("/api/required-docs", (_req, res) =>
    res.json({
      success: true,
      required_documents: [
        "Bank Statements (Last 6 months)",
        "Business License",
        "Tax Returns (Last 2 years)",
        "Financial Statements",
      ],
    })
  );

  // Back-compat alias for validate-intake (shared token)
  try {
    const { requireSharedToken } = await import("./middleware/requireSharedToken.js");
    const { applicationsValidateRouter } = await import("./routes/applications.validate.js");
    app.use("/api/v1/applications/validate-intake", requireSharedToken, applicationsValidateRouter());
    console.log("✅ /api/v1/applications/validate-intake mounted (shared token)");
  } catch (e: any) {
    console.log("❌ validate-intake alias failed:", e.message);
  }

  // Client integration mount
  try {
    const srcApiMount = (await import("./routes/src-api-mount")).default;
    app.use(srcApiMount);
  } catch (e: any) {
    console.log("❌ Client integration API routes failed:", e.message);
  }

  // --- Auth
  setupAuth(app);
  app.use(attachUserIfPresent);

  // --- “Public before auth” API
  try {
    const applicationsRouter = (await import("./routes/api/applications")).default;
    app.use("/api/applications", applicationsRouter);
    app.use("/api/v1/applications", applicationsRouter);
  } catch (e: any) {
    console.log("❌ Applications router failed:", e.message);
  }

  try {
    const applicationsPresenceRouter = (await import("./routes/api/applications.presence")).default;
    app.use("/api/applications", applicationsPresenceRouter);
    app.use("/api/v1/applications", applicationsPresenceRouter);
  } catch (e: any) {
    console.log("❌ Applications presence router failed:", e.message);
  }

  try {
    const csrfRouter = (await import("./routes/csrf")).default;
    app.use("/api/csrf-token", csrfRouter);
  } catch (e: any) {
    console.log("❌ CSRF router failed:", e.message);
  }

  try {
    const { productsV1Router } = await import("./routes/products.v1");
    app.use("/api/v1/products", productsV1Router());
  } catch (e: any) {
    console.log("❌ V1 products router failed:", e.message);
  }

  try {
    const lendersApiRouter = (await import("./routes/lenders-api")).default;
    app.use("/api", lendersApiRouter);
  } catch (e: any) {
    console.log("❌ Lenders API router failed:", e.message);
  }

  try {
    const settingsRouter = (await import("./routes/settings")).default;
    app.use("/api/settings", settingsRouter);
  } catch (e: any) {
    console.log("❌ Settings router failed:", e.message);
  }

  try {
    const twilioRouter = (await import("./routes/twilio")).default;
    app.use("/api/twilio", twilioRouter);
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_VERIFY_SERVICE_SID) {
      console.log(`[Twilio] Account: ${process.env.TWILIO_ACCOUNT_SID?.substring(0, 8)}...`);
      console.log(`[Twilio] Verify Service: ${process.env.TWILIO_VERIFY_SERVICE_SID?.substring(0, 8)}...`);
    } else {
      console.warn("[Twilio] ⚠️  Missing account or verify service env vars!");
    }
  } catch (e: any) {
    console.log("❌ Twilio router failed:", e.message);
  }

  try {
    const sequencesRouter = (await import("./routes/sequences")).default;
    app.use("/api/sequences", sequencesRouter);
  } catch (e: any) {
    console.log("❌ Sequences router failed:", e.message);
  }

  try {
    const lendersConfigRouter = (await import("./routes/lenders-config")).default;
    app.use("/api/lenders", lendersConfigRouter);
  } catch (e: any) {
    console.log("❌ Lenders config router failed:", e.message);
  }

  try {
    const documentsConfigRouter = (await import("./routes/documents-config")).default;
    app.use("/api/documents", documentsConfigRouter);
  } catch (e: any) {
    console.log("❌ Documents config router failed:", e.message);
  }

  try {
    const securityConfigRouter = (await import("./routes/security-config")).default;
    app.use("/api/security", securityConfigRouter);
  } catch (e: any) {
    console.log("❌ Security config router failed:", e.message);
  }

  try {
    const devStubs = (await import("./routes/dev-stubs")).default;
    app.use("/api", devStubs);
  } catch (e: any) {
    console.log("❌ Dev stubs router failed:", e.message);
  }

  // --- Staff-only protection (skip for public endpoints listed)
  console.log("🔧 [OIB] Applying authMiddleware to staff-protected routes");
  app.use("/api", (req, res, next) => {
    const p = (req.originalUrl || req.url) as string;
    if (
      p.includes("/api/v1/products") ||
      p.includes("/api/lenders") ||
      p.includes("/api/required-docs") ||
      p.includes("/api/_int/state") ||
      p.includes("/api/applications/validate-intake") ||
      p.includes("/api/v1/applications") ||
      p.includes("/api/csrf-token") ||
      p.includes("/api/auth/") ||
      p.includes("/api/session/") ||
      p.includes("/api/uploads/") ||
      p.includes("/api/public/") ||
      p.includes("/api/pipeline") ||
      p.includes("/api/cards") ||
      p.includes("/api/dashboard/") ||
      p.includes("/api/apps") ||
      p.includes("/api/user-management") ||
      p.includes("/api/settings/") ||
      p.includes("/api/twilio/") ||
      p.includes("/api/lenders/") ||
      p.includes("/api/documents/") ||
      p.includes("/api/security/") ||
      p.includes("/api/calendar/") ||
      p.includes("/api/tasks") ||
      p.includes("/api/reports/") ||
      p.includes("/api/marketing/") ||
      p.includes("/api/ads/") ||
      p.includes("/api/dialer/") ||
      p.includes("/api/email") ||
      p.includes("/api/sms") ||
      p.includes("/api/crm") ||
      p.includes("/api/office365") ||
      p.includes("/api/ai/") ||
      p.includes("/api/ocr") ||
      p.includes("/api/audit") ||
      p.includes("/api/retry-queue") ||
      p.includes("/api/pdf/") ||
      p.includes("/api/comms/") ||
      p.includes("/api/_int/")
    ) {
      return next();
    }
    authMiddleware(req, res, next);
  });

  // --- Protected routes
  try {
    const { contactsRouter } = await import("./routes/contacts");
    app.use("/api/contacts", contactsRouter);
  } catch (e: any) {
    console.log("❌ contacts.ts import failed:", e.message);
  }

  try {
    const dashboardRouter = (await import("./routes/dashboard")).default;
    app.use("/api/dashboard", dashboardRouter);
  } catch (e: any) {
    console.log("❌ Dashboard router failed:", e.message);
  }

  // Voice mounted once (remove duplicates elsewhere)
  try {
    const voiceRouter = (await import("./routes/voice")).default;
    app.use("/api/voice", voiceRouter);
  } catch (e: any) {
    console.log("voice.ts not found");
  }

  try {
    const diagDupes = (await import("./routes/diag.dupes")).default;
    app.use("/api", diagDupes);
  } catch {}

  try {
    const duplicateOverride = (await import("./routes/admin/duplicateOverride")).default;
    app.use("/api/admin", duplicateOverride);
  } catch {}

  try {
    const staffContactsRouter = (await import("./routes/staff-contacts.mjs")).default; // @ts-ignore
    app.use("/api", staffContactsRouter);
  } catch {}

  try {
    const staffLenderProductsRouter = (await import("./routes/staffLenderProducts")).default;
    app.use("/api/staff", staffLenderProductsRouter);
  } catch (e: any) {
    console.log("❌ Staff lender products router failed:", e.message);
  }

  try {
    const lookupRouter = (await import("./routes/lookup")).default;
    app.use("/api/lookup", lookupRouter);
  } catch (e: any) {
    console.log("❌ Lookup router failed:", e.message);
  }

  try {
    const appsRouter = (await import("./routes/apps")).default;
    app.use("/api/apps", appsRouter);
  } catch (e: any) {
    console.log("❌ Apps router failed:", e.message);
  }

  try {
    const userManagementApiRouter = (await import("./routes/user-management-api")).default;
    app.use("/api/user-management", userManagementApiRouter);
  } catch (e: any) {
    console.log("❌ User Management API router failed:", e.message);
  }

  try {
    const analyticsRouter = (await import("./routes/analytics")).default;
    app.use("/api", analyticsRouter);
  } catch {}

  try {
    const applicationDetailRouter = (await import("./routes/application-detail.mjs")).default; // @ts-ignore
    app.use("/api", applicationDetailRouter);
  } catch {}

  try {
    const marketingRouter = (await import("./routes/marketing")).default;
    app.use("/api", marketingRouter);
  } catch {}

  try {
    const aiHelpersRouter = (await import("./routes/ai-helpers.mjs")).default; // @ts-ignore
    app.use("/api", aiHelpersRouter);
  } catch {}

  try {
    const notificationsRouter = (await import("./routes/notifications")).default;
    app.use("/api", notificationsRouter);
  } catch {}

  // Pipeline + Cards auth bypass
  app.use("/api/pipeline", (req, _res, next) => {
    (req as any).skipAuth = true;
    next();
  });
  app.use("/api/cards", (req, _res, next) => {
    (req as any).skipAuth = true;
    next();
  });

  try {
    const pipelineRouter = (await import("./routes/pipeline")).default;
    app.use("/api/pipeline", pipelineRouter);
  } catch (e: any) {
    console.log("❌ Pipeline router failed:", e.message);
  }

  try {
    const hubspotRouter = (await import("./routes/hubspot.mjs")).default; // @ts-ignore
    app.use("/api", hubspotRouter);
  } catch {}

  try {
    const globalSearchRouter = (await import("./routes/global-search.mjs")).default; // @ts-ignore
    app.use("/api", globalSearchRouter);
  } catch {}

  try {
    const billingRouter = (await import("./routes/billing.mjs")).default; // @ts-ignore
    app.use("/api", billingRouter);
  } catch {}

  try {
    const featureFlagsRouter = (await import("./routes/feature-flags.mjs")).default; // @ts-ignore
    app.use("/api", featureFlagsRouter);
  } catch {}

  try {
    const buildGuardRouter = (await import("./routes/build-guard.mjs")).default; // @ts-ignore
    app.use("/api", buildGuardRouter);
  } catch {}

  try {
    const adminCatalog = (await import("./routes/_admin-catalog.mjs")).default; // @ts-ignore
    app.use(adminCatalog);
  } catch (e: any) {
    console.log("❌ Admin catalog failed:", e.message);
  }

  // AI / OCR / Banking / Comms / PDF
  try {
    const creditSummaryRouter = (await import("./routes/ai-features")).default;
    app.use("/api/ai", creditSummaryRouter);
  } catch {}

  try {
    const ocrInsightsRouter = (await import("./routes/ocrInsights")).default;
    app.use("/api/ocr-insights", ocrInsightsRouter);
  } catch {}

  try {
    const bankingRouter = (await import("./routes/banking")).default;
    app.use("/api/banking", bankingRouter);
  } catch {}

  try {
    const commsRouter = (await import("./routes/comms")).default;
    app.use("/api/comms", commsRouter);
  } catch {}

  try {
    const aiDocAnalysisRouter = (await import("./routes/ai/documentAnalysis")).default;
    app.use("/api/ai", aiDocAnalysisRouter);
  } catch {}

  try {
    const pdfGenRouter = (await import("./routes/pdf-generation")).default;
    app.use("/api/pdf", pdfGenRouter);
  } catch {}

  // Dev helpers
  if (process.env.NODE_ENV !== "production") {
    app.get("/debug/trace/:id", (req, res) => {
      const base = path.join(process.cwd(), "reports", "staff-trace-live", req.params.id);
      try {
        const incoming = JSON.parse(fs.readFileSync(path.join(base, "incoming.json"), "utf8"));
        const card = JSON.parse(fs.readFileSync(path.join(base, "card.json"), "utf8"));
        const map = JSON.parse(fs.readFileSync(path.join(base, "map.json"), "utf8"));
        res.json({ ok: true, incoming, card, map });
      } catch {
        res.status(404).json({ ok: false, error: "not_found", hint: base });
      }
    });

    // Unhandled API routes -> JSON 404
    app.use("/api/*", (req, res, next) => {
      if (res.headersSent) return next();
      res.status(404).json({ error: `API endpoint not found: ${req.path}` });
    });
  }

  // Route duplicate guard
  try {
    assertUniqueRoutes(app, [
      "/api/auth/session",
      "/api/voice/token",
      "/api/tasks",
      "/api/calendar",
      "/api/user-management",
      "/api/pipeline",
    ]);
  } catch (error: any) {
    console.error("❌ CRITICAL: Route duplication detected!", error.message);
    process.exit(1);
  }

  // SPA fallback (non-API, non-asset)
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return res.status(404).json({ error: "API endpoint not found" });
    if (req.path.startsWith("/assets/") || req.path.startsWith("/brand/") || /\.[a-z0-9]+$/i.test(req.path)) return next();
    if (!fs.existsSync(INDEX_HTML)) return res.status(500).send("Application build not found");
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "-1");
    res.setHeader("X-Build-Time", new Date().toISOString());
    res.sendFile(INDEX_HTML);
  });

  console.log("🌐 External access ready");

  // Jobs
  try {
    const { initLinkedInScheduler } = await import("./jobs/linkedinScheduler");
    initLinkedInScheduler();
  } catch (e: any) {
    console.log("❌ LinkedIn scheduler failed:", e.message);
  }
}
```
