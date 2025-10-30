import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { requireAuth } from '../middleware/authMiddleware';

const router = Router();
const limiter = rateLimit({ windowMs: 60_000, max: 60 });

type Segment = {
  id?: string;
  name: string;
  description?: string;
  // A JSON filter config (state, lenderId, staffId, date range, free text, etc.)
  // Keep it aligned with your Contacts filter API.
  filter: Record<string, any>;
  audience?: 'clients' | 'lenders' | 'referrers' | 'evangelists' | 'all';
  createdBy?: string;
  updatedAt?: string;
};

// Mock database operations for segments (using a simple in-memory store for demo)
let segmentsStore: (Segment & { id: string; updatedAt: string })[] = [];
let nextId = 1;

const segmentsDb = {
  async list() {
    return segmentsStore;
  },
  async create(data: Segment) {
    const item = {
      ...data,
      id: `seg-${nextId++}`,
      updatedAt: new Date().toISOString()
    };
    segmentsStore.push(item);
    return item;
  },
  async update(id: string, data: Partial<Segment>) {
    const index = segmentsStore.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Segment not found');
    segmentsStore[index] = { ...segmentsStore[index], ...data, updatedAt: new Date().toISOString() };
    return segmentsStore[index];
  },
  async delete(id: string) {
    segmentsStore = segmentsStore.filter(s => s.id !== id);
  },
  async findById(id: string) {
    return segmentsStore.find(s => s.id === id) || null;
  }
};

router.get('/', limiter, async (_req, res) => {
  const items = await segmentsDb.list();
  res.json({ ok: true, items });
});

router.post('/', limiter, async (req: any, res: any) => {
  const body = req.body as Segment;
  if (!body?.name || !body?.filter) return res.status(400).json({ ok: false, reason: 'missing_name_or_filter' });
  const seg = await segmentsDb.create({
    name: body.name.trim(),
    description: body.description || '',
    filter: body.filter,
    audience: body.audience || 'clients',
    createdBy: (req as any).user?.id || null
  });
  res.json({ ok: true, item: seg });
});

router.put('/:id', limiter, async (req: any, res: any) => {
  const { id } = req.params;
  const body = req.body as Partial<Segment>;
  try {
    const item = await segmentsDb.update(id, body);
    res.json({ ok: true, item });
  } catch (error: unknown) {
    res.status(404).json({ ok: false, reason: 'segment_not_found' });
  }
});

router.delete('/:id', limiter, async (req: any, res: any) => {
  const { id } = req.params;
  await segmentsDb.delete(id);
  res.json({ ok: true });
});

// Preview/run segment: returns limited fields + count
router.get('/:id/run', limiter, async (req: any, res: any) => {
  const { id } = req.params;
  const seg = await segmentsDb.findById(id);
  if (!seg) return res.status(404).json({ ok: false, reason: 'segment_not_found' });

  try {
    // Use the same filtering logic - for demo, get all contacts and apply basic filtering
    const allContacts = await db.execute(sql`
      SELECT id, email, phone, full_name as fullName, status, updatedAt as updatedAt
      FROM contacts
      LIMIT 100
    `);
    
    const contactsData = allContacts.rows || allContacts;
    
    // Apply segment filter
    let filtered = contactsData;
    if (seg.filter.state) {
      filtered = filtered.filter((c: any) => c.status === seg.filter.state);
    }
    
    const items = filtered.map((c: any) => ({
      id: c.id,
      email: c.email,
      phone: c.phone,
      name: c.fullName || c.email || c.phone || '—',
      state: c.status,
    }));
    
    res.json({ ok: true, audience: seg.audience || 'clients', count: items.length, items });
  } catch (error: unknown) {
    console.error('Error running segment:', error);
    res.status(500).json({ ok: false, error: 'Failed to run segment' });
  }
});

export default router;