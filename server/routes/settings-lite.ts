import { Router } from "express";
import fs from "fs"; import path from "path"; import crypto from "crypto";
const r = Router();
const DATA_DIR = path.join(process.cwd(),"server","data");
const FILE = path.join(DATA_DIR,"settings.json");
type Role = "admin"|"manager"|"ops"|"agent"|"read_only";
type User = { id:string; email:string; name?:string; roles:Role[]; active:boolean; createdAt:string };

function ensure(){ if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true});
  if(!fs.existsSync(FILE)){
    const seed: {users:User[], flags:Record<string,boolean>, experiments:Record<string,{enabled:boolean;note?:string}>} = {
      users: [
        {id:crypto.randomUUID(), email:"admin@example.com", name:"Admin", roles:["admin"], active:true, createdAt:new Date().toISOString()},
        {id:crypto.randomUUID(), email:"ops@example.com",   name:"Ops",   roles:["ops","manager"], active:true, createdAt:new Date().toISOString()},
      ],
      flags: { pipelineDnd:true, commsCenter:false, lendersAdmin:true, strictAuth:false },
      experiments: { "dashboard.cards.v2":{enabled:false,note:"New layout"}, "pipeline.lane.kpis":{enabled:false,note:"Lane metrics"} }
    };
    fs.writeFileSync(FILE, JSON.stringify(seed,null,2));
  }
}
function load(){ ensure(); return JSON.parse(fs.readFileSync(FILE,"utf8")); }
function save(data:any){ fs.writeFileSync(FILE, JSON.stringify(data,null,2)); }

r.get("/users", (_req,res)=>{ const d=load(); res.json(d.users); });
r.post("/users", (req,res)=>{ const d=load(); const {email,name} = req.body||{}; if(!email) return res.status(400).json({error:"email required"});
  const u:User = { id:crypto.randomUUID(), email, name, roles:["agent"], active:true, createdAt:new Date().toISOString() };
  d.users.push(u); save(d); res.json(u);
});
r.patch("/users/:id", (req,res)=>{ const d=load(); const i=d.users.findIndex((x:User)=>x.id===req.params.id);
  if(i<0) return res.status(404).json({error:"not found"});
  d.users[i] = {...d.users[i], ...req.body}; save(d); res.json(d.users[i]);
});
r.delete("/users/:id", (req,res)=>{ const d=load(); const i=d.users.findIndex((x:User)=>x.id===req.params.id);
  if(i<0) return res.status(404).json({error:"not found"}); const [rm]=d.users.splice(i,1); save(d); res.json({ok:true, id:rm.id});
});

r.get("/flags", (_req,res)=>{ const d=load(); res.json(d.flags); });
r.patch("/flags/:key", (req,res)=>{ const d=load(); d.flags[req.params.key]=!!req.body?.value; save(d); res.json({key:req.params.key, value:!!req.body?.value}); });

r.get("/experiments", (_req,res)=>{ const d=load(); res.json(d.experiments); });
r.patch("/experiments/:key", (req,res)=>{ const d=load(); const e=d.experiments[req.params.key]||{enabled:false}; e.enabled=!!req.body?.enabled; d.experiments[req.params.key]=e; save(d); res.json({key:req.params.key, enabled:e.enabled}); });

export default r;
