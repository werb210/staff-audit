import { Router } from "express";
import fs from "fs"; import path from "path";
const r = Router();
type Stage = "new"|"requires_docs"|"in_review"|"lender"|"accepted"|"declined";
type Card = { id:string; applicant?:string; name?:string; amount?:number; docs_ok?:boolean; stage?:Stage; createdAt?:string; [k:string]:any };
type Board = Record<Stage, Card[]>;
const DATA_DIR = path.join(process.cwd(),"server","data");
const FILE = path.join(DATA_DIR,"pipeline.json");
function ensure(){
  if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true});
  if(!fs.existsSync(FILE)){
    const demo:Board = {
      new:[{id:"A-1001",applicant:"Acme LLC",amount:15000,docs_ok:false,stage:"new",createdAt:new Date().toISOString()}],
      requires_docs:[{id:"A-1002",applicant:"Delta Inc",amount:6200,docs_ok:false,stage:"requires_docs"}],
      in_review:[{id:"A-1003",applicant:"Beta Corp",amount:8200,docs_ok:true,stage:"in_review"}],
      lender:[], accepted:[], declined:[]
    };
    fs.writeFileSync(FILE, JSON.stringify(demo,null,2));
  }
}
function load():Board{ ensure(); return JSON.parse(fs.readFileSync(FILE,"utf8")); }
function save(b:Board){ fs.writeFileSync(FILE, JSON.stringify(b,null,2)); }

r.get("/board", (_req,res)=>{ res.json(load()); });
r.get("/cards/:id", (req,res)=>{ const b=load(); for(const k of Object.keys(b) as Stage[]){ const hit=b[k].find(c=>c.id===req.params.id); if(hit) return res.json(hit); } return res.status(404).json({error:"not found"}); });
r.patch("/cards/:id/move", (req,res)=>{ const to = (req.body?.stage||"").toString() as Stage;
  if(!["new","requires_docs","in_review","lender","accepted","declined"].includes(to)) return res.status(400).json({error:"bad stage"});
  const b=load(); let moved:Card|undefined; let from:Stage|undefined;
  for(const k of Object.keys(b) as Stage[]){ const i=b[k].findIndex(c=>c.id===req.params.id); if(i>=0){ from=k; const [card]=b[k].splice(i,1); card.stage=to; moved=card; break; } }
  if(!moved) return res.status(404).json({error:"not found"});
  b[to].unshift(moved); save(b); res.json({ok:true, id:moved.id, from, to});
});
export default r;
