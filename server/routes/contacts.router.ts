import { Router } from "express"; export const contactsRouter=Router();
function norm(c:any){ if(c.email) c.email=String(c.email).trim().toLowerCase(); if(c.phone) c.phone=String(c.phone).trim(); return c;}
contactsRouter.get("/", async (req:any,res:any)=>{ /* TODO: wire DB */ return res.json([]);});
contactsRouter.get("/search", async (req:any,res:any)=>{ const q=String(req.query.q||"").toLowerCase(); return res.json({items:[],q});});
contactsRouter.post("/merge", async (req:any,res:any)=>{ const {primaryId,duplicateId}=req.body||{}; return res.json({ok:true,merged:{primaryId,duplicateId}});});
export default contactsRouter;
contactsRouter.post("/upsert", async (req:any,res:any)=>{ const c=norm(req.body||{}); /* TODO DB upsert by email/phone */ return res.json({ok:true,contact:c});});
