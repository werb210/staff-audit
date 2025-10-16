import { Router } from "express";
import { Queue } from "bullmq";
import IORedis from "ioredis";
const r = Router();
const connection = new IORedis(process.env.REDIS_URL||"");
const names = ["av-scan","seq-run","lender-reports","budget-alerts"];

r.get("/ops/queues", async (_req,res)=>{
  const out:any={};
  for(const n of names){
    const q = new Queue(n, { connection });
    try{
      out[n] = await q.getJobCounts("wait","active","completed","failed","delayed");
    }catch{ out[n] = { error:"unavailable" }; }
  }
  res.json({ ok:true, queues: out });
});

export default r;