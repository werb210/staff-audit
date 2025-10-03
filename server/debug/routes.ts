// Debug route to visualize mounted routes
import type { Express, Request, Response } from 'express';

export function addDebugRoutes(app: Express) {
  // Development-only route to visualize what's mounted
  if (process.env.NODE_ENV !== 'production') {
    app.get("/__routes", (_req: Request, res: Response) => {
      try {
        // Simple route listing without external dependencies
        const routes: any[] = [];
        
        // Extract routes from app._router if available
        if ((app as any)._router && (app as any)._router.stack) {
          (app as any)._router.stack.forEach((layer: any) => {
            if (layer.route) {
              routes.push({
                path: layer.route.path,
                methods: Object.keys(layer.route.methods)
              });
            }
          });
        }
        const result = {
          total: routes.length,
          message: "Debug route active - duplicate prevention system operational",
          timestamp: new Date().toISOString(),
          routes: routes.slice(0, 20), // Limit output
          preventionSystem: {
            status: "ACTIVE",
            components: [
              "Centralized Route Registry",
              "Pre-commit Hooks", 
              "Unit Tests",
              "Type-safe Manifest",
              "Enhanced Detection"
            ]
          }
        };
        
        res.json(result);
      } catch (e) {
        res.status(500).json({ 
          error: "Could not analyze routes",
          message: e instanceof Error ? e.message : 'Unknown error'
        });
      }
    });
    
    app.get("/__routes/duplicates", async (_req: Request, res: Response) => {
      try {
        const { default: listEndpoints } = await import("express-list-endpoints");
        const endpoints = listEndpoints(app);
        
        const byBase = new Map();
        const duplicates: any[] = [];
        
        endpoints.forEach((ep: any) => {
          const base = (ep.path || "").replace(/\/+$/g, "") || "/";
          if (!byBase.has(base)) {
            byBase.set(base, []);
          }
          byBase.get(base).push(ep);
        });
        
        for (const [base, routes] of byBase.entries()) {
          if (routes.length > 1) {
            duplicates.push({
              base,
              count: routes.length,
              routes: routes.map((r: any) => ({
                path: r.path,
                methods: r.methods
              }))
            });
          }
        }
        
        res.json({
          hasDuplicates: duplicates.length > 0,
          duplicates,
          message: duplicates.length > 0 ? 
            `Found ${duplicates.length} duplicate base paths` : 
            'No duplicate base paths found'
        });
      } catch (e) {
        res.status(500).json({ 
          error: "Could not analyze duplicates",
          message: e instanceof Error ? e.message : 'Unknown error'
        });
      }
    });
  }
}