import { Router } from "express";
const r = Router();
r.get("/_int/route-dump", (req, res) => {
    // @ts-ignore
    const stack = req.app._router?.stack ?? [];
    const routes = [];
    for (const layer of stack) {
        if (!layer.route)
            continue;
        const methods = Object.keys(layer.route.methods)
            .filter(Boolean)
            .map(m => m.toUpperCase())
            .sort();
        routes.push({ path: layer.route.path, methods });
    }
    res.json({ count: routes.length, routes });
});
export default r;
