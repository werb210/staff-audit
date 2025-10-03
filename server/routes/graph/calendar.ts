import { Router } from "express";
import { Client } from "@microsoft/microsoft-graph-client";
import { getValidAccessToken } from "../../services/graphAuth";

const router = Router();

router.get("/list", async (req: any, res: any) => {
  const userId = req.user?.id || req.session?.user?.id;
  if (!userId) return res.status(401).json({ error: "No session" });
  const token = await getValidAccessToken(userId);
  const client = Client.init({ authProvider: (done)=>done(null, token) });
  const events = await client.api("/me/events").orderby("start/dateTime DESC").top(50).get();
  res.json(events?.value || []);
});

router.post("/create", async (req: any, res: any) => {
  const { subject, startISO, endISO, bodyHtml } = req.body || {};
  const userId = req.user?.id || req.session?.user?.id;
  if (!userId) return res.status(401).json({ error: "No session" });
  const token = await getValidAccessToken(userId);
  const client = Client.init({ authProvider: (done)=>done(null, token) });
  const created = await client.api("/me/events").post({
    subject,
    start: { dateTime: startISO, timeZone: "UTC" },
    end:   { dateTime: endISO,   timeZone: "UTC" },
    body: { contentType: "HTML", content: bodyHtml || "" }
  });
  res.json(created);
});

export default router;