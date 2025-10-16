import type { Express } from "express";

/**
 * Enhanced route diagnostics with comprehensive path analysis.
 * Enabled ONLY when process.env.API_DIAG === "1".
 * Returns detailed route information including client-expected paths.
 */
export function attachRouteReporter(app: Express) {
  if (process.env.API_DIAG !== "1") return;
  
  app.get("/api/_int/routes", (req, res) => {
    const routes: any[] = [];
    const aliases: any[] = [];
    
    const walk = (stack: any[], base = "") => {
      for (const layer of stack || []) {
        if (layer.route?.path) {
          const methods = Object.keys(layer.route.methods || {}).map(m => m.toUpperCase());
          const fullPath = (base + layer.route.path).replace(/\/+/g, "/");
          routes.push({ 
            methods, 
            path: fullPath,
            regexp: layer.regexp?.source || null,
            keys: layer.keys?.map((k:any) => k.name) || []
          });
        } else if (layer.name === "router" && layer.handle?.stack) {
          // Extract router mount path from regexp
          const mountPath = layer.regexp?.source?.match(/^\^\\?\/(.*?)\\\//)?.[1]?.replace(/\\\//g, "/") || "";
          const newBase = base + (mountPath ? "/" + mountPath : "");
          walk(layer.handle.stack, newBase);
        }
      }
    };
    
    // @ts-ignore
    walk((app as any)?._router?.stack || []);
    
    // Filter for API routes and categorize
    const apiRoutes = routes.filter(r => r.path.startsWith("/api"));
    const clientRoutes = apiRoutes.filter(r => 
      r.path.includes("/v1/products") || 
      r.path.includes("/lenders") || 
      r.path.includes("/required-docs") ||
      r.path.includes("/applications") ||
      r.path.includes("/uploads")
    );
    
    res.json({
      total_routes: routes.length,
      api_routes: apiRoutes.length,
      client_expected_routes: clientRoutes.length,
      routes: apiRoutes,
      client_routes: clientRoutes,
      generated_at: new Date().toISOString()
    });
  });
}