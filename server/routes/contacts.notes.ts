import { Router } from "express";
import { db } from "../db/drizzle";
import { comms } from "../db/schema";
import { requireAuth } from "../auth/verifyOnly";
const r = Router(); r.use(requireAuth);
// Create a note on a contact timeline
r.post("/contacts/:id/notes", async (req:any,res)=>{
  const { body } = req.body||{};
  if(!body) return res.status(400).json({ ok:false, error:"note_body_required" });
  await db.insert(comms).values({
    contactId: req.params.id as any, kind:"note", direction:"out", body, meta: JSON.stringify({ author:req.user.sub })
  });
  res.json({ ok:true });
});
export default r;