import { Router } from 'express';
import { authBearer } from '../middleware/authBearer.js';
const r = Router(); 
r.use(authBearer);

r.get('/', async (req,res)=> {
  const { assignee = 'me' } = req.query;
  // TODO: list tasks scoped to user/tenant
  res.json([]);
});

r.post('/', async (req,res)=> {
  // TODO: create task
  res.status(201).json({ id:'task_'+Date.now(), ...req.body });
});

r.patch('/:id', async (req,res)=> {
  // TODO: update task status/fields
  res.json({ ok:true });
});

export default r;