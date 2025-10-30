import { makeDupGuard } from "./middleware/dup-guard.mjs";
export default function mountAdminDupGuards(app) {
    // Pages
    app.post("/admin/pages", makeDupGuard({ table: "pages", cols: ["tenant_id", "slug"] }), (req, res, next) => next());
    app.put("/admin/pages", makeDupGuard({ table: "pages", cols: ["tenant_id", "slug"] }), (req, res, next) => next());
    // Features (if present)
    app.post("/admin/features", makeDupGuard({ table: "features", cols: ["tenant_id", "feature_key"] }), (req, res, next) => next());
    app.put("/admin/features", makeDupGuard({ table: "features", cols: ["tenant_id", "feature_key"] }), (req, res, next) => next());
}
