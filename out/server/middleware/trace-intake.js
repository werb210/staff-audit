import fs from "fs";
import path from "path";
const ensureDir = (p) => { try {
    fs.mkdirSync(p, { recursive: true });
}
catch { } };
const FLAT = (o, p = [], out = {}) => {
    const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);
    if (Array.isArray(o)) {
        o.forEach((v, i) => FLAT(v, [...p, String(i)], out));
        return out;
    }
    if (isObj(o)) {
        Object.entries(o).forEach(([k, v]) => FLAT(v, [...p, k], out));
        return out;
    }
    out[p.join(".")] = o;
    return out;
};
export function traceIntake(req, res, next) {
    const tid = (req.header("X-Trace-Id") || (req.body?._trace?.id) || "");
    req.__traceId = tid;
    // capture incoming body snapshot
    const base = path.join(process.cwd(), "reports", "staff-trace-live", tid || "no-trace");
    ensureDir(base);
    try {
        fs.writeFileSync(path.join(base, "incoming.json"), JSON.stringify({
            at: Date.now(),
            headers: { "x-trace-id": tid, "content-type": req.header("content-type") },
            fields: (req.body?._trace?.fields) || Object.keys(FLAT(req.body || {})),
            body: req.body
        }, null, 2));
    }
    catch { }
    // Wrap res.json to capture card payloads on creation/detail endpoints
    const orig = res.json.bind(res);
    res.json = (data) => {
        try {
            // heuristics: record when path looks like card/application endpoints
            const tag = (req.path.includes("/pipeline/cards") || req.path.includes("/applications")) ? "card" : "resp";
            fs.writeFileSync(path.join(base, `${tag}.json`), JSON.stringify({
                at: Date.now(), method: req.method, path: req.path, data
            }, null, 2));
            // lightweight map (which incoming keys made it through)
            const inFields = new Set(((req.body?._trace?.fields) || Object.keys(FLAT(req.body || {}))));
            const outFields = Object.keys(FLAT(data || {}));
            const intersect = outFields.filter(k => inFields.has(k) || inFields.has(k.split(".").pop() || ""));
            fs.writeFileSync(path.join(base, "map.json"), JSON.stringify({
                approx_mapped_fields: intersect.sort(), out_total: outFields.length, in_total: inFields.size
            }, null, 2));
        }
        catch { }
        return orig(data);
    };
    next();
}
