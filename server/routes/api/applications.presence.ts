import { Router } from 'express';
import { db } from '../../db/drizzle';
import { applications } from '../../db/schema';
import { desc, eq } from 'drizzle-orm';

const router = Router();

router.get('/:id/presence', async (req: any, res: any) => {
  try {
    // Handle "latest" as a special case
    if (req.params.id === 'latest') {
      return res.redirect('/api/applications/latest/presence');
    }
    
    const [app] = await db.select().from(applications).where(eq(applications.id, req.params.id)).limit(1);
    if (!app) return res.status(404).json({ error: 'Not found' });
    
    const canon = (app as any).application_canon ?? {};
    const canonCount = canon && typeof canon === 'object' ? Object.keys(canon).length : 0;
    
    res.json({
      hasCanon: !!(app as any).application_canon,
      version: (app as any).application_canon_version ?? 'v1',
      canonCount,
      fieldCount: (app as any).application_field_count ?? canonCount,
      id: app.id
    });
  } catch (error: unknown) {
    console.error('❌ Presence check error:', error);
    res.status(500).json({ error: 'Presence check failed' });
  }
});

router.get('/latest/presence', async (_req, res) => {
  try {
    const rows = await db.select().from(applications).orderBy(desc(applications.createdAt)).limit(1);
    if (rows.length === 0) return res.json({ hasCanon: false, canonCount: 0 });
    
    const app = rows[0] as any;
    const canon = app.application_canon ?? {};
    const canonCount = canon && typeof canon === 'object' ? Object.keys(canon).length : 0;
    
    res.json({
      hasCanon: !!app.application_canon,
      version: app.application_canon_version ?? 'v1',
      canonCount,
      fieldCount: app.application_field_count ?? canonCount,
      id: app.id,
      createdAt: app.createdAt
    });
  } catch (error: unknown) {
    console.error('❌ Latest presence check error:', error);
    res.status(500).json({ error: 'Latest presence check failed' });
  }
});

export default router;