import { Router } from "express";
import { db } from "../db/drizzle.js";
const r = Router();
r.get("/lenders/products/:id/requirements", async (req, res) => {
    const p = await db.lender_products.findUnique({ where: { id: req.params.id } });
    if (!p)
        return res.status(404).json({ ok: false, error: "product_not_found" });
    const list = p.description?.requiredDocs ?? []; // Using description field for MVP
    res.json({ ok: true, productId: p.id, requiredDocs: list });
});
r.get("/applications/:id/requirements", async (req, res) => {
    // Resolve best product for this application (if set), else return union across lender's products
    const app = await db.applications.findUnique({
        where: { id: req.params.id }
    });
    if (!app?.lender_id)
        return res.json({ ok: true, requiredDocs: [] });
    const prods = await db.lender_products.findMany({
        where: { lender_id: app.lender_id }
    });
    const set = new Set();
    prods.forEach(p => {
        const docs = p.description?.requiredDocs || [];
        docs.forEach((d) => set.add(d));
    });
    res.json({
        ok: true,
        lenderId: app.lender_id,
        requiredDocs: Array.from(set)
    });
});
// Add required docs to a lender product
r.patch("/lenders/products/:id/requirements", async (req, res) => {
    const { requiredDocs } = req.body || {};
    const p = await db.lender_products.findUnique({ where: { id: req.params.id } });
    if (!p)
        return res.status(404).json({ ok: false, error: "product_not_found" });
    const newDescription = {
        ...(p.description || {}),
        requiredDocs: requiredDocs || []
    };
    const updated = await db.lender_products.update({
        where: { id: req.params.id },
        data: { description: newDescription }
    });
    res.json({ ok: true, product: updated });
});
export default r;
