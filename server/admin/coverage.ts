import { Router } from "express";
import listEndpoints from "express-list-endpoints";
export const coverageRouter = Router();

coverageRouter.get("/routes", (req, res) => {
  res.json(listEndpoints(req.app));
});

coverageRouter.get("/manifest", (_req, res) => {
  // Map API routes to UI testIDs you expect to exist
  res.json([
    { method: "GET",  path: "/api/health",             selector: "[data-testid='btn-health']" },
    { method: "GET",  path: "/api/crm/contacts",       selector: "[data-testid='btn-contacts-load']" },
    { method: "POST", path: "/api/sms/send",           selector: "[data-testid='btn-sms-send']" },
    { method: "GET",  path: "/api/pipeline",           selector: "[data-testid='btn-pipeline-load']" },
    { method: "GET",  path: "/api/lender-products",    selector: "[data-testid='btn-lenders-load']" },
    { method: "GET",  path: "/api/documents/:appId",   selector: "[data-testid='btn-docs-load']" },
    { method: "GET",  path: "/api/ocr/:docId",         selector: "[data-testid='btn-ocr-run']" },
    { method: "GET",  path: "/api/banking/:appId",     selector: "[data-testid='btn-banking-run']" },
    { method: "POST", path: "/api/zip/:appId",         selector: "[data-testid='btn-zip-download']" }
  ]);
});