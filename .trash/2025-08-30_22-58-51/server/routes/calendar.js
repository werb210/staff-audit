import { Router } from 'express';
import { authBearer } from '../middleware/authBearer.js';
const r = Router(); 
r.use(authBearer);

r.get('/', async (req,res)=> {
  const { range = 'week' } = req.query;
  // TODO: return events for range
  res.json({ range, events: [] });
});

r.post('/', async (req,res)=> {
  // TODO: create event
  res.status(201).json({ id:'evt_'+Date.now(), ...req.body });
});

export default r;