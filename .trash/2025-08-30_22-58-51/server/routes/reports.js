import { Router } from 'express';
import { authBearer } from '../middleware/authBearer.js';
const r = Router(); 
r.use(authBearer);

const OK = new Set(['velocity','win-rate','doc-sla','activity','product']);

r.get('/:key', async (req,res)=>{
  const { key } = req.params; 
  const { from, to } = req.query;
  if (!OK.has(key)) return res.status(404).json({ error:'Unknown report' });
  // TODO: compute summary
  res.json({ key, from, to, metrics: {} });
});

export default r;