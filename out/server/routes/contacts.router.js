import { Router } from "express";
export const contactsRouter = Router();
function norm(c) { if (c.email)
    c.email = String(c.email).trim().toLowerCase(); if (c.phone)
    c.phone = String(c.phone).trim(); return c; }
contactsRouter.get("/", async (req, res) => { /* TODO: wire DB */ return res.json([]); });
contactsRouter.get("/search", async (req, res) => { const q = String(req.query.q || "").toLowerCase(); return res.json({ items: [], q }); });
contactsRouter.post("/merge", async (req, res) => { const { primaryId, duplicateId } = req.body || {}; return res.json({ ok: true, merged: { primaryId, duplicateId } }); });
export default contactsRouter;
contactsRouter.post("/upsert", async (req, res) => { const c = norm(req.body || {}); /* TODO DB upsert by email/phone */ /* TODO DB upsert by email/phone */ return res.json({ ok: true, contact: c }); });
