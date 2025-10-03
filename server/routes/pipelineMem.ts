import { Router } from "express";

type StageKey = "new"|"requires_docs"|"in_review"|"lender"|"accepted"|"declined";
type Card = { id:string; applicant:string; amount?:number; docs_ok?:boolean; stage:StageKey; createdAt?:string };

const mem = {
  lanes: new Map<StageKey, Card[]>([
    ["new", [
      {id:"D2", applicant:"Acme LLC", amount:1732.51, docs_ok:false, stage:"new", createdAt:new Date().toISOString()},
    ]],
    ["requires_docs", [
      {id:"D1", applicant:"Test Business Ltd", amount:572.13, docs_ok:false, stage:"requires_docs", createdAt:new Date().toISOString()},
    ]],
    ["in_review", [
      {id:"D3", applicant:"Widget IO", amount:110.2, docs_ok:true, stage:"in_review", createdAt:new Date().toISOString()},
    ]],
    ["lender", []],
    ["accepted", []],
    ["declined", []],
  ])
};

function findCard(id:string){
  for (const [stage, arr] of mem.lanes){
    const idx = arr.findIndex(c=>c.id===id);
    if (idx >= 0) return { stage, idx, card: arr[idx] };
  }
  return null;
}

export default function pipelineMemRoutes(){
  const r = Router();

  // GET board (grouped as lanes)
  r.get("/board", (_req, res) => {
    res.json({ lanes: Array.from(mem.lanes.entries()).map(([key,items]) => ({ key, items })) });
  });

  // GET single card details
  r.get("/cards/:id", (req: any, res: any) => {
    const found = findCard(req.params.id);
    if (!found) return res.status(404).json({ error: "not found" });
    res.json(found.card);
  });

  // PATCH card stage (primary DnD endpoint)
  r.patch("/cards/:id/stage", (req: any, res: any) => {
    const to: StageKey = (req.body?.stage || "").trim();
    if (!to || !mem.lanes.has(to)) return res.status(400).json({ error: "invalid target stage" });

    const found = findCard(req.params.id);
    if (!found) return res.status(404).json({ error: "card not found" });

    // Gate example: moving to in_review requires docs_ok
    if (to === "in_review" && !found.card.docs_ok) {
      return res.status(409).json({ error: "Requires docs before review" });
    }

    // Move
    mem.lanes.get(found.stage)!.splice(found.idx, 1);
    found.card.stage = to;
    mem.lanes.get(to)!.unshift(found.card);

    res.json({ ok: true, id: found.card.id, stage: to });
  });

  // POST move (alternate shape)
  r.post("/move", (req: any, res: any) => {
    const id = String(req.body?.id || "");
    const to: StageKey = (req.body?.stage || "").trim();
    if (!id || !to) return res.status(400).json({ error: "id and stage required" });
    
    // Call PATCH logic directly
    const found = findCard(id);
    if (!found) return res.status(404).json({ error: "card not found" });
    if (!mem.lanes.has(to as StageKey)) return res.status(400).json({ error: "invalid target stage" });

    // Gate example: moving to in_review requires docs_ok
    if (to === "in_review" && !found.card.docs_ok) {
      return res.status(409).json({ error: "Requires docs before review" });
    }

    // Move
    mem.lanes.get(found.stage)!.splice(found.idx, 1);
    found.card.stage = to;
    mem.lanes.get(to)!.unshift(found.card);

    res.json({ ok: true, id: found.card.id, stage: to });
  });

  return r;
}