let ROUTES = [];
export function collectRoutes(app) {
    const out = [];
    // Express internal stack introspection (safe, read-only)
    // @ts-ignore internal
    const stack = app._router?.stack ?? [];
    for (const layer of stack) {
        if (layer.route?.path && layer.route?.methods) {
            for (const [m, on] of Object.entries(layer.route.methods)) {
                if (on)
                    out.push({ method: m.toUpperCase(), path: layer.route.path });
            }
        }
        else if (layer.name === "router" && layer.handle?.stack) {
            for (const s of layer.handle.stack) {
                const route = s.route;
                if (!route)
                    continue;
                for (const [m, on] of Object.entries(route.methods)) {
                    if (on)
                        out.push({ method: m.toUpperCase(), path: route.path });
                }
            }
        }
    }
    ROUTES = out.sort((a, b) => (a.path + a.method).localeCompare(b.path + b.method));
}
export function getRoutes() {
    return ROUTES;
}
