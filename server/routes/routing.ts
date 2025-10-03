import { Router } from "express";
import { routerStore, isOpen } from "../services/router";
import { requireRole } from "../security/rbac";
const router = Router();

router.get("/agents", (req,res)=> res.json({ items: routerStore.listAgents() }));
router.post("/agents", requireRole(["manager","admin"]), (req,res)=>{
  const a = req.body;
  routerStore.upsertAgent({ id:a.id, name:a.name, number:a.number, skills:a.skills||[], online:!!a.online });
  res.json({ ok:true });
});
router.post("/agents/:id/online", (req,res)=>{ routerStore.setOnline(req.params.id, !!req.body.online); res.json({ ok:true }); });

router.get("/queues", (req,res)=> res.json({ items: routerStore.listQueues() }));
router.post("/queues", requireRole(["manager","admin"]), (req,res)=>{
  routerStore.upsertQueue(req.body);
  res.json({ ok:true });
});

/** GET next agent for queue */
router.get("/assign", (req,res)=>{
  const qid = req.query.queueId as string;
  const skills = ((req.query.skills as string)||"").split(",").filter(Boolean);
  const q = routerStore.listQueues().find(q => q.id===qid);
  if (!isOpen(q)) return res.json({ open:false, agent:null });
  const agent = routerStore.nextAgentFor(qid, skills);
  res.json({ open:true, agent });
});

export default router;