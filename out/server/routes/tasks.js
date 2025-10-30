import { Router } from 'express';
const r = Router();
const mem = new Map();
r.get('/api/tasks', (_req, res) => res.json({ ok: true, items: [...mem.values()] }));
r.post('/api/tasks', (req, res) => {
    const { title, due_at, priority, assignee_id, contact_id, type = 'todo', notes } = req.body || {};
    const id = 'tsk_' + crypto.randomUUID();
    const task = { id, title, due_at, priority, assignee_id, contact_id, type, notes, createdAt: new Date().toISOString() };
    mem.set(id, task);
    res.json({ ok: true, task });
});
r.patch('/api/tasks/:id', (req, res) => {
    const t = mem.get(req.params.id);
    if (!t)
        return res.status(404).end();
    Object.assign(t, req.body);
    res.json({ ok: true, task: t });
});
r.delete('/api/tasks/:id', (req, res) => {
    mem.delete(req.params.id);
    res.json({ ok: true });
});
export default r;
