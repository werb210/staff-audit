import { Router } from "express";
import { presignUpload, presignDownload, head } from "../lib/s3";
const r = Router();
// POST /api/documents/presign-upload { applicationId, filename, contentType }
r.post("/presign-upload", async (req, res) => {
    const appId = String(req.body?.applicationId || "").trim();
    const filename = String(req.body?.filename || "").trim();
    const ct = String(req.body?.contentType || "application/octet-stream");
    if (!appId || !filename)
        return res.status(400).json({ error: "applicationId and filename required" });
    const key = `applications/${appId}/uploads/${Date.now()}-${filename}`;
    const url = await presignUpload(key, ct, 900);
    return res.json({ key, url, contentType: ct, expiresIn: 900 });
});
// GET /api/documents/presign-download?key=...
r.get("/presign-download", async (req, res) => {
    const key = String(req.query.key || "").trim();
    if (!key)
        return res.status(400).json({ error: "key required" });
    const url = await presignDownload(key, 900);
    return res.json({ key, url, expiresIn: 900 });
});
// GET /api/documents/audit/head?key=...
r.get("/audit/head", async (req, res) => {
    const key = String(req.query.key || "").trim();
    if (!key)
        return res.status(400).json({ error: "key required" });
    const h = await head(key);
    return res.json(h);
});
export default r;
