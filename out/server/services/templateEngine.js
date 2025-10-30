import { Liquid } from "liquidjs";
const engine = new Liquid({
    cache: true,
    strictFilters: false,
    strictVariables: false
});
// Common filters
engine.registerFilter("upper", (v) => String(v ?? "").toUpperCase());
engine.registerFilter("lower", (v) => String(v ?? "").toLowerCase());
engine.registerFilter("truncate", (v, n = 120) => String(v ?? "").slice(0, n));
engine.registerFilter("urlencode", (v) => encodeURIComponent(String(v ?? "")));
engine.registerFilter("date", (v, fmt = "%Y-%m-%d") => {
    const d = v ? new Date(v) : new Date();
    // minimal strftime-like:
    return fmt
        .replace("%Y", String(d.getUTCFullYear()))
        .replace("%m", String(d.getUTCMonth() + 1).padStart(2, "0"))
        .replace("%d", String(d.getUTCDate()).padStart(2, "0"));
});
export async function renderLiquid(tpl, vars) {
    return await engine.parseAndRender(tpl, vars);
}
