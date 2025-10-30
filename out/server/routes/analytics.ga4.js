import { Router } from "express";
import { sendGA4 } from "../services/ga4.js";
import { requireAuth } from "../auth/verifyOnly.js";
const r = Router();
r.post("/analytics/ga4/track", requireAuth, async (req, res) => {
    const { events = [], clientId } = req.body || {};
    const out = await sendGA4(events, { clientId, userId: req.user?.sub });
    res.json(out);
});
export default r;
