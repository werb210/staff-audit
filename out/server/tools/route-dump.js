import { AUTH_SESSION_ENDPOINT, TWILIO_TOKEN_ENDPOINT, } from "../../shared/apiRoutes";
function list(app) {
    const routes = [];
    const stack = app?._router?.stack || [];
    for (const layer of stack) {
        if (layer.route && layer.route.path) {
            const methods = Object.keys(layer.route.methods).filter(m => layer.route.methods[m]);
            for (const m of methods)
                routes.push({ method: m.toUpperCase(), path: layer.route.path });
        }
        else if (layer.name === "router" && layer.handle && layer.handle.stack) {
            for (const l of layer.handle.stack) {
                if (l.route && l.route.path) {
                    const methods = Object.keys(l.route.methods).filter(m => l.route.methods[m]);
                    for (const m of methods)
                        routes.push({ method: m.toUpperCase(), path: l.route.path });
                }
            }
        }
    }
    return routes;
}
// This will be called with the app instance when needed
export function verifyRoutes(app) {
    const routes = list(app);
    // Enforce uniqueness for critical endpoints
    const mustBeUnique = [
        { method: "GET", path: AUTH_SESSION_ENDPOINT },
        { method: "GET", path: TWILIO_TOKEN_ENDPOINT },
    ];
    let failed = false;
    for (const target of mustBeUnique) {
        const hits = routes.filter(r => r.method === target.method && r.path === target.path);
        if (hits.length !== 1) {
            failed = true;
            console.log(`❌ Route ${target.method} ${target.path} mounted ${hits.length} times (expected 1)`);
        }
    }
    if (failed) {
        console.log("\n⛔ Route dump FAILED. You still have duplicates mounted at runtime.\n");
        return false;
    }
    else {
        console.log("\n✅ Route dump clean. Critical endpoints are mounted exactly once.\n");
        console.log("Total routes:", routes.length);
        return true;
    }
}
