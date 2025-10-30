import { Router } from "express";
const r = Router();
r.get("/api-keys", (_req, res) => {
    res.json({
        ok: true,
        keys: [
            {
                id: "k1",
                lastUsed: null,
                createdAt: Date.now() - 86400000 // 1 day ago
            },
            {
                id: "k2",
                lastUsed: Date.now() - 3600000, // 1 hour ago
                createdAt: Date.now() - 604800000 // 1 week ago
            }
        ]
    });
});
r.post("/api-keys", (_req, res) => {
    const newKeyId = "key_" + Math.random().toString(36).slice(2, 10);
    const token = "sk_" + Math.random().toString(36).slice(2, 20);
    res.json({
        ok: true,
        id: newKeyId,
        token: token,
        message: 'API key created successfully'
    });
});
r.delete("/api-keys/:id", (req, res) => {
    const { id } = req.params;
    res.json({
        ok: true,
        message: `API key ${id} revoked successfully`
    });
});
r.get("/webhooks", (_req, res) => {
    res.json({
        ok: true,
        hooks: [
            {
                id: "w1",
                url: "https://example.com/webhook/applications",
                active: true,
                events: ["application.created", "application.approved"]
            },
            {
                id: "w2",
                url: "https://partner.com/api/webhook",
                active: false,
                events: ["application.funded"]
            }
        ]
    });
});
r.post("/webhooks", (req, res) => {
    const { url, events = [] } = req.body;
    const newId = "webhook_" + Math.random().toString(36).slice(2, 8);
    res.json({
        ok: true,
        id: newId,
        url,
        events,
        active: true,
        message: 'Webhook created successfully'
    });
});
export default r;
