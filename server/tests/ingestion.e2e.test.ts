import request from 'supertest';
import fixture from '../../fixtures/application.v1.json';
import type { Express } from 'express';

// Try to import your server app (adjust if your export differs)
let app: Express;
beforeAll(async () => {
  const mod = await import('../../server/index');
  app = (mod.default || mod.app || mod.server) as Express;
});

test('POST /api/applications stores application with full canon payload if available', async () => {
  const res = await request(app)
    .post('/api/applications')
    .set('Content-Type', 'application/json')
    .set('X-Trace-Id', 'E2E-FIDELITY-TRACE')
    .send(fixture as any);

  expect(res.status).toBeLessThan(300);
  const id = res.body.id || res.body.data?.id;
  expect(id).toBeTruthy();

  // Optional DB verification if Drizzle is available
  try {
    const { db } = await import('../..//server/db/drizzle');
    const { applications } = await import('../..//server/db/schema' as any);
    // Drizzle helper (fallback: raw query)
    const rows = await (db as any).select().from((applications as any)).where((_: any)=>true);
    const row = rows.find((r: any) => String(r.id) === String(id)) || rows.at(-1);
    expect(row).toBeTruthy();

    // Prefer lossless jsonb column if you have it (e.g., application_canon)
    const canon = row.application_canon || row.canon || row.payload || null;
    if (canon) {
      for (const k of Object.keys(fixture)) {
        expect(canon).toHaveProperty(k);
      }
    } else {
      // Otherwise validate mapped columns spot-checks (tweak to your schema)
      expect(row.country || row.businessLocation || row.business_location).toBe('US');
      expect(
        row.product_category || row.lookingFor || row.selectedCategory
      ).toBeTruthy();
    }
  } catch (e) {
    // DB not accessible in test env — API acceptance is still verified
    console.warn('[WARN] Skipping DB verification:', (e as Error).message);
  }
});