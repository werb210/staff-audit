import express from "express";
import analyticsRouter from "./analytics/index.js";
import clientRouter from "./client/index.js";
import staffRouter from "./staff/index.js";
import twilioRouter from "./twilio/index.js";
import adminCodexRouter from "./admin/codex.js";
import authRouter from "./auth.js";
import pipelineRouter from "./pipeline.js";
import communicationsRouter from "./communications/index.js";
import { guardedRegisterUse, clearRouteRegistry, } from "../lib/routeGuard";
import { mountDocumentRoutes } from "./documents.js";
import { ANALYTICS_BASE_PATH, ADMIN_CODEX_BASE_PATH, API_ROOT, AUTH_BASE_PATH, CLIENT_BASE_PATH, COMMUNICATIONS_BASE_PATH, PIPELINE_BASE_PATH, STAFF_BASE_PATH, TWILIO_BASE_PATH, } from "../../shared/apiRoutes";
function stripApiRoot(fullPath) {
    if (fullPath.startsWith(API_ROOT)) {
        return fullPath.slice(API_ROOT.length) || "/";
    }
    return fullPath;
}
const ROUTES = [
    {
        mountPath: stripApiRoot(ADMIN_CODEX_BASE_PATH),
        router: adminCodexRouter,
        name: "admin-codex",
        description: "Codex operational metrics dashboard",
    },
    {
        mountPath: stripApiRoot(ANALYTICS_BASE_PATH),
        router: analyticsRouter,
        name: "analytics",
        description: "Analytics dashboard APIs",
    },
    {
        mountPath: stripApiRoot(CLIENT_BASE_PATH),
        router: clientRouter,
        name: "client",
        description: "Client portal APIs",
    },
    {
        mountPath: stripApiRoot(STAFF_BASE_PATH),
        router: staffRouter,
        name: "staff",
        description: "Staff application APIs",
    },
    {
        mountPath: stripApiRoot(TWILIO_BASE_PATH),
        router: twilioRouter,
        name: "twilio",
        description: "Twilio webhook and SMS endpoints",
    },
    {
        mountPath: stripApiRoot(AUTH_BASE_PATH),
        router: authRouter,
        name: "auth",
        description: "Authentication and session endpoints",
    },
    {
        mountPath: stripApiRoot(PIPELINE_BASE_PATH),
        router: pipelineRouter,
        name: "pipeline",
        description: "Pipeline data access APIs",
    },
    {
        mountPath: stripApiRoot(COMMUNICATIONS_BASE_PATH),
        router: communicationsRouter,
        name: "communications",
        description: "Inbound call and communications endpoints",
    },
];
function joinPaths(basePath, routePath) {
    const base = basePath.replace(/\/+$/, "");
    const route = routePath.replace(/^\/+/, "");
    if (!base && !route) {
        return "/";
    }
    if (!base) {
        return `/${route}`;
    }
    if (!route) {
        return base || "/";
    }
    return `${base}/${route}`;
}
function registerRoute(target, path, router, label, useGuard) {
    if (useGuard) {
        guardedRegisterUse(target, path, router, label);
    }
    else {
        target.use(path, router);
    }
}
export function registerRoutes(target, options = {}) {
    const { basePath = "/api", useGuard = true, includeDocuments = true } = options;
    if (useGuard) {
        clearRouteRegistry();
    }
    ROUTES.forEach(({ mountPath, router, name }) => {
        const fullPath = joinPaths(basePath, mountPath);
        registerRoute(target, fullPath, router, `api:${name}`, useGuard);
    });
    if (includeDocuments) {
        mountDocumentRoutes(target, basePath);
    }
    const summaryRouter = express.Router();
    summaryRouter.get("/", (_req, res) => {
        const routes = ROUTES.map(({ mountPath, description: desc }) => ({
            path: joinPaths(basePath, mountPath),
            description: desc,
        }));
        res.json({ ok: true, routes });
    });
    const indexPath = joinPaths(basePath, "");
    registerRoute(target, indexPath, summaryRouter, "api:index", useGuard);
    return target;
}
export function createApiRouter(options = {}) {
    const router = express.Router();
    const { basePath = "", includeDocuments = true } = options;
    registerRoutes(router, {
        basePath,
        useGuard: false,
        includeDocuments,
    });
    return router;
}
const defaultRouter = createApiRouter();
export default defaultRouter;
