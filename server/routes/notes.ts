import {Router} from 'express';
import {mem} from '../db/mem'; import {FLAGS} from '../config/flags';
const r = Router();

r.get('/api/contacts/:id/notes', (req,res)=>{ const items=[...mem.notes.values()].filter(n=>n.contactId===req.params.id); res.json({ok:true, items}); });
r.post('/api/contacts/:id/notes', (req,res)=>{ if(!FLAGS.O365_NOTES_ENABLED) return res.status(404).end();
  const n = { id:'note_'+crypto.randomUUID(), contactId:req.params.id, authorId:req.user?.id??'system', html:req.body.html, createdAt:new Date().toISOString() };
  mem.notes.set(n.id, n); res.json({ok:true, note:n});
});

r.post('/api/notes', (req,res)=>{
  const { body, contact_id } = req.body || {};
  const note = { id: 'note_'+crypto.randomUUID(), body, contact_id, createdAt: new Date().toISOString() };
  mem.notes.set(note.id, note);
  res.json({ ok:true, note });
});
export default r;