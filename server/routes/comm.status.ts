// server/routes/comm.status.ts
import type { Request, Response } from "express";

// Map many vendor states → 4 canonical values
const MAP: Record<string,"queued"|"sent"|"delivered"|"failed"> = {
  queued:"queued", accepted:"queued", sending:"queued",
  sent:"sent", submitted:"sent",
  delivered:"delivered", read:"delivered",
  failed:"failed", undelivered:"failed", bounced:"failed"
};

export async function recent(req:Request,res:Response){
  // TODO: replace with real fetch from DB/queues
  const items = (await req.app.locals.db?.all?.("select * from comm_events order by createdAt desc limit 50").catch(()=>[])) || [];
  const normalized = items.map((e:any)=>({
    id: e.id, type: e.type || "sms", to: e.to,
    status: MAP[(e.status||"").toLowerCase()] || "failed",
    error: e.error || null, at: e.createdAt || Date.now()
  }));
  res.json({ ok:true, items: normalized });
}