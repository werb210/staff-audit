import express, { type Application, type Router } from "express";

import { guardedRegisterUse, clearRouteRegistry } from "./lib/routeGuard.js";
import analyticsRoutes from "./routes/analytics/index.js";
import clientRoutes from "./routes/client/index.js";
import staffRoutes from "./routes/staff/index.js";
import communicationsRoutes from "./routes/communications/index.js";
import authRoutes from "./routes/auth.js";
import pipelineRoutes from "./routes/pipeline.js";
import twilioRoutes from "./routes/twilio.js";
import s3Routes from "./routes/s3ProductionTest.js";
import publicApi from "./routes/publicApi.js";
import adminCodex from "./routes/admin/codex.js";
import { mountDocumentRoutes } from "./routes/documents.js";
import contactsRoutes from "./routes/contacts.js";
import internalRoutes from "./routes/_int/index.js";

export type MountTarget = Application | Router;

const CANONICAL_ROUTES: Array<{ path: string; router: Router; name: string }> = [
  { path: "/api/analytics", router: analyticsRoutes, name: "analytics" },
  { path: "/api/client", router: clientRoutes, name: "client" },
  { path: "/api/staff", router: staffRoutes, name: "staff" },
  { path: "/api/communications", router: communicationsRoutes, name: "communications" },
  { path: "/api/auth", router: authRoutes, name: "auth" },
  { path: "/api/pipeline", router: pipelineRoutes, name: "pipeline" },
  { path: "/api/contacts", router: contactsRoutes, name: "contacts" },
  { path: "/api/twilio", router: twilioRoutes, name: "twilio" },
  { path: "/api/s3", router: s3Routes, name: "s3Test" },
  { path: "/api/public", router: publicApi, name: "publicApi" },
  { path: "/api/admin/codex", router: adminCodex, name: "adminCodex" },
  { path: "/api/_int", router: internalRoutes, name: "internal" }
];

const mountedTargets = new WeakSet<MountTarget>();

function mountDocuments(target: MountTarget) {
  const documentsRouter = express.Router();
  mountDocumentRoutes(documentsRouter, "");
  guardedRegisterUse(target, "/api", documentsRouter, "documents");
}

function mountCanonicalRoutes(target: MountTarget) {
  for (const { path, router, name } of CANONICAL_ROUTES) {
    guardedRegisterUse(target, path, router, name);
  }

  mountDocuments(target);

  if (typeof (target as Router).get === "function") {
    const probeTarget = target as Application & Router;
    const stubEndpoints = [
      "/api/auth/login",
      "/api/pipeline",
      "/api/documents",
      "/api/twilio",
      "/api/s3",
    ];

    for (const path of stubEndpoints) {
      probeTarget.get(path, (_req, res, next) => {
        if (res.headersSent) {
          next();
          return;
        }

        res.json({ ok: true, probe: true, path });
      });
    }

    const probeResponse = { ok: true, message: "Codex probe OK" } as const;

    probeTarget.get("/api/__probe", (_req, res) => {
      res.json(probeResponse);
    });

    probeTarget.get("/api/probe", (_req, res) => {
      res.json(probeResponse);
    });
  }
}

export function registerRoutes(target: MountTarget) {
  if (mountedTargets.has(target)) {
    return target;
  }

  clearRouteRegistry();
  mountCanonicalRoutes(target);
  mountedTargets.add(target);
  return target;
}

export function createRouter() {
  const router = express.Router();
  registerRoutes(router);
  return router;
}

export default registerRoutes;
