import { Router } from "express";
const r = Router();
// Static matrix you can extend as needed
r.get("/ops/coverage", (_req,res)=>{
  const endpoints = [
    { area:"Auth", routes:["/auth/request-otp","/auth/verify-otp"] },
    { area:"Comms", routes:["/api/inbox/*","/webhooks/twilio/*","/twiml/voice/*"] },
    { area:"Docs", routes:["/api/documents/*"] },
    { area:"Marketing", routes:["/api/marketing/*"] },
    { area:"Productivity", routes:["/api/tasks/*","/api/schedule/*","/api/o365/*"] },
    { area:"AI", routes:["/api/ai/*"] },
    { area:"Ops", routes:["/api/ops/*"] }
  ];
  res.json({ ok:true, endpoints });
});
export default r;