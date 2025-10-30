import { Router } from "express";
import { z } from "zod";
import { getFeatureRegistry } from "../../features/registry";
const r = Router();
const EventBody = z.object({
    featureId: z.string().min(1),
    kind: z.enum(["panel-mounted", "action-available", "action-fired", "output-rendered"]).default("panel-mounted"),
    meta: z.record(z.any()).optional(),
    at: z.number().optional(), // epoch ms
});
const ConfigBody = z.object({
    featureId: z.string().min(1),
    key: z.string().min(1),
    value: z.any(),
});
r.get("/", (_req, res) => {
    const reg = getFeatureRegistry();
    const status = reg.wiringStatus();
    res.json({
        ok: true,
        features: status.rows,
        wiring: status,
        ts: Date.now()
    });
});
r.get("/static", (_req, res) => {
    const reg = getFeatureRegistry();
    res.json({ ok: true, features: reg.staticList(), ts: Date.now() });
});
r.post("/events", (req, res) => {
    const parsed = EventBody.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            ok: false,
            error: "Invalid body",
            issues: parsed.error.issues
        });
    }
    const { featureId, kind, meta, at } = parsed.data;
    const reg = getFeatureRegistry();
    reg.recordEvent({
        featureId: featureId,
        kind,
        meta,
        at: at ?? Date.now(),
        ip: req.ip
    });
    res.json({ ok: true });
});
r.post("/config", (req, res) => {
    const parsed = ConfigBody.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            ok: false,
            error: "Invalid body",
            issues: parsed.error.issues
        });
    }
    const { featureId, key, value } = parsed.data;
    const reg = getFeatureRegistry();
    reg.setOption(featureId, key, value);
    res.json({ ok: true, featureId, key, value });
});
r.get("/health", (_req, res) => {
    const reg = getFeatureRegistry();
    const snap = reg.wiringStatus();
    res.json({ ok: true, counts: snap.counts, ts: Date.now() });
});
export default r;
