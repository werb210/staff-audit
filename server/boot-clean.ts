import express from "express";
import path from "node:path";
import crypto from "node:crypto";

const app = express();
const PORT = Number(process.env.PORT || 5000);

// --- Route registry: prevents duplicates globally
const mounted = new Set<string>();
function mountOnce(p: string, r: express.Router | express.Express) {
  if (mounted.has(p)) return;
  app.use(p, r as any);
  mounted.add(p);
}

// --- Simple ops router for diagnostics
const ops = express.Router();
ops.get("/health", (_req, res) => {
  res.json({ ok: true, ports: PORT, mounts: [...mounted] });
});
ops.get("/routes", (_req, res) => {
  res.json({
    mounts: [...mounted].map((p) => ({ path: p })),
    base: process.env.BASE_PATH || "/",
  });
});
ops.get("/kill-sw.js", (_req, res) => {
  res.type("application/javascript").send(
    `self.addEventListener('install',e=>self.skipWaiting());
     self.addEventListener('activate',e=>self.clients.claim());
     self.addEventListener('fetch',()=>{});`
  );
});
mountOnce("/api/ops", ops);

// --- SPA mount with base-path + red banner injection
const CLIENT_DIR = process.env.FORCE_CLIENT_DIR || path.join(process.cwd(), "client", "dist");
const INDEX_PATH = path.join(CLIENT_DIR, "index.html");

function mountSpa(app: express.Express) {
  const fs = require("node:fs");
  if (!fs.existsSync(INDEX_PATH)) {
    console.error("[SPA] index.html not found at", INDEX_PATH);
    return;
  }
  const html = fs.readFileSync(INDEX_PATH, "utf8");
  const hash = crypto.createHash("sha256").update(html).digest("hex").slice(0, 8);

  const banner = process.env.SHOW_DEBUG_BANNER ? `
    <div style="position:fixed;top:0;left:0;right:0;z-index:999999;
      background:#d0021b;color:#fff;padding:6px 10px;font:600 12px/1 system-ui;">
      DEBUG BUILD • hash=${hash} • served-from=${CLIENT_DIR}
    </div>` : "";

  const inject = (body: string, baseHref: string) =>
    body.replace("<head>", `<head><base href="${baseHref}"><meta name="app-base" content="${baseHref}">`)
        .replace("<body>", `<body>${banner}`);

  // DISABLED: Duplicate static mounts - using canonical spaMount.ts only
  // app.use("/assets", express.static(path.join(CLIENT_DIR, "assets"), { immutable: true, maxAge: "1y" }));
  // app.use("/favicon.ico", express.static(path.join(CLIENT_DIR, "favicon.ico"), { maxAge: "1d" }));

  app.use((req, res, next) => {
    // Prefix inference: supports /, /d/, /@user/repl/, etc.
    const url = req.originalUrl || "/";
    const parts = url.split("/");
    let inferred = "/";
    if (parts.length > 2 && parts[1].startsWith("@")) {
      inferred = `/${parts[1]}/${parts[2]}/`;
    } else if (parts.length > 1 && parts[1] === "d") {
      inferred = "/d/";
    }
    res.setHeader("X-Served-From", CLIENT_DIR);
    res.setHeader("X-Index-Hash", hash);
    res.setHeader("X-Base-Inferred", inferred);
    if (req.method !== "GET") return next();
    // Always serve index for SPA routes
    res.type("html").send(inject(html, inferred));
  });

  console.log(`🎯 [SPA-MOUNT] client=${CLIENT_DIR} hash=${hash}`);
}

mountSpa(app);

// ---- Database-driven API routes
import lendersRouter from "./routes/lenders.js";
import lenderProductsRouter from "./routes/lender-products.js";

mountOnce("/api/lenders", lendersRouter);
mountOnce("/api/lender-products", lenderProductsRouter);

// ===== WEBHOOK: Client Sync Endpoint =====
// This endpoint receives lender product updates from external systems and the client app expects this
app.post("/api/sync/lender-products", async (req: any, res: any) => {
  try {
    // Check for CLIENT_SYNC_KEY authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: "Missing or invalid authorization header"
      });
    }
    
    const key = authHeader.replace("Bearer ", "");
    if (key !== process.env.CLIENT_SYNC_KEY) {
      console.log(`🔒 [SYNC] Invalid sync key attempted: ${key.substring(0, 10)}...`);
      return res.status(403).json({
        success: false,
        error: "Unauthorized - Invalid sync key"
      });
    }
    
    const { products } = req.body;
    
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({
        success: false,
        error: "Invalid products array"
      });
    }
    
    console.log(`📥 [SYNC] Received ${products.length} lender products from external system`);
    
    // Process the received products - could update database, trigger notifications, etc.
    // For now, just log and acknowledge receipt
    
    res.json({
      success: true,
      message: `Successfully received ${products.length} lender products`,
      productsReceived: products.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ [SYNC] Error processing lender products sync:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process lender products sync"
    });
  }
});

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("[GLOBAL]", err);
  res.status(500).json({ ok: false, error: "server_error" });
});

app.listen(PORT, () =>
  console.log(`✅ [CLEAN BOOT] Server on :${PORT}, client=${CLIENT_DIR}`)
);