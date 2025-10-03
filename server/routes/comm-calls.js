import { Router } from 'express';
import { authBearer } from '../middleware/authBearer.js';
import { requireRoles } from '../middleware/rbac.ts';

const r = Router();
r.use(authBearer);

r.post('/', requireRoles('admin','user','marketing'), async (req,res)=>{
  const { contactId, appId, direction, outcome, duration, notes, transcript } = req.body || {};
  // TODO: persist call log
  res.status(201).json({ ok:true, id:'call_'+Date.now(), contactId, outcome });
});

export default r;