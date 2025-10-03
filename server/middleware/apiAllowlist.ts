const allowedPaths = [
  /^\/api\/health/,
  /^\/api\/meta/,
  /^\/api\/pipeline/,
  /^\/api\/contacts/,
  /^\/api\/slf/,
  /^\/api\/lenders(\/[^\/]+)?$/,
  /^\/api\/lenders\/categories\/summary$/,
  /^\/api\/lenders\/required-documents\/[^\/]+$/,
  /^\/api\/lender-products/,
  /^\/api\/applications/,
  /^\/api\/activities/,
  /^\/api\/voice/,
  /^\/api\/approvals/,
  /^\/api\/messaging/,
  /^\/api\/ads/,
  /^\/api\/auth/,
  /^\/api\/whoami/,
  /^\/api\/ping/,
  /^\/api\/status/,
  /^\/api\/public\/applications$/,
  /^\/api\/client-compat\/lenders(\/[^\/]+)?$/,
  /^\/api\/client-compat\/lenders\/categories\/summary$/,
  /^\/api\/client-compat\/lenders\/required-documents\/[^\/]+$/,
  /^\/api\/client-compat\/public\/applications$/,
  // Client App Integration API - Public Access
  /^\/api\/client\/.*$/
];

export function apiAllowlist(req:any, res:any, next:any){
  if (process.env.API_ENFORCE_STRICT !== "true") return next();
  if (req.path.startsWith("/api/") && !allowedPaths.some(rx => rx.test(req.path))) {
    console.error("[API-BLOCK]", req.method, req.path);
    return res.status(410).json({ ok: false, error: "api_path_blocked", path: req.path });
  }
  next();
}