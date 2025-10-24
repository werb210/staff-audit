import type { Express } from "express";
import cors, { type CorsOptions } from "cors";
import {
  applyCSP,
  corsAllowlist,
  iframeSandbox,
  permissionsPolicy,
} from "./csp.js";

export { corsAllowlist, iframeSandbox };

function buildCorsOptions(): CorsOptions {
  return {
    origin(origin, cb) {
      if (!origin) {
        return cb(null, true);
      }

      const allowed = corsAllowlist.some((entry) =>
        entry instanceof RegExp ? entry.test(origin) : entry === origin
      );

      return allowed ? cb(null, true) : cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Trace-Id",
      "X-App-Schema",
      "X-App-Version",
      "X-Admin-Token",
      "X-Lender-Id",
      "X-Request-ID",
    ],
    exposedHeaders: ["X-DB-Host", "X-Instance"],
    maxAge: 600,
    optionsSuccessStatus: 204,
  };
}

export function applySecurity(app: Express) {
  applyCSP(app);

  app.use((_req, res, next) => {
    res.setHeader("Permissions-Policy", permissionsPolicy);
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-Iframe-Sandbox", iframeSandbox);
    next();
  });

  app.use(cors(buildCorsOptions()));
}
