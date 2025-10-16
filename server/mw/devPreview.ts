import type { Request, Response, NextFunction } from "express";

export function devPreviewHeaders(req: Request, res: Response, next: NextFunction) {
  const isProd = process.env.NODE_ENV === "production";
  // Fresh HTML every time
  if (req.accepts("text/html")) {
    res.setHeader("Cache-Control", "no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }
  // Frame policy: relax only in dev so Replit preview works
  if (!isProd) {
    // CSP now handled by unified configuration in server/security/csp.ts
    // Only set X-Frame-Options for iframe compatibility
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
  }
  next();
}