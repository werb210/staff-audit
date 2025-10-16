import { Router } from "express";
import { requirePermission } from "../../services/authz";
import { postSlack } from "../../services/alerts/slack";

const router = Router();

router.post("/test", async (_req, res)=>{
  try { 
    await postSlack(":white_check_mark: Staff Observability test alert"); 
    res.json({ ok:true }); 
  }
  catch(e:any){ 
    res.status(500).json({ ok:false, error:String(e?.message||e) }); 
  }
});

export default router;