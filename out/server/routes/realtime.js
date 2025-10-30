import { Router } from "express";
import { EventEmitter } from "events";
import { requireAuth } from "../auth/verifyOnly";
export const bus = new EventEmitter();
const r = Router();
// Staff subscribe per-contact or all (auth required)
r.get("/realtime/subscribe", requireAuth, (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.flushHeaders();
    const topic = String(req.query.contactId || "*");
    const fn = (evt) => { if (topic === "*" || evt.contactId === topic)
        res.write(`data: ${JSON.stringify(evt)}\n\n`); };
    bus.on("msg", fn);
    req.on("close", () => bus.off("msg", fn));
});
export function publishMessage(evt) { bus.emit("msg", evt); }
export default r;
