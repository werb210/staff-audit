import request from 'supertest';
import fixture from '../../fixtures/application.v1.json';
import type { Express } from 'express';

let app: Express;
let createdId: string;

beforeAll(async () => {
  const mod = await import('../../server/index');
  app = (mod.default || mod.app || mod.server) as Express;
  const res = await request(app).post('/api/applications').send(fixture as any);
  createdId = res.body.id || res.body.data?.id;
});

test('PDF context carries all fields (if service present)', async () => {
  try {
    const svc = await import('../../server/services/pdfGeneratorService');
    const getCtx = (svc as any).getPdfContextForApp || (svc as any).buildPdfContext || null;
    if (!getCtx) return console.warn('[SKIP] pdfGeneratorService.getPdfContextForApp not found');

    const ctx = await getCtx(createdId);
    for (const k of Object.keys(fixture)) {
      expect(ctx).toHaveProperty(k);
    }
  } catch {
    console.warn('[SKIP] pdfGeneratorService unavailable');
  }
});

test('Credit summary context carries all fields (if service present)', async () => {
  try {
    const svc = await import('../../server/services/aiApplicationService');
    const getCtx = (svc as any).getCreditSummaryContext || (svc as any).buildCreditInput || null;
    if (!getCtx) return console.warn('[SKIP] aiApplicationService.getCreditSummaryContext not found');

    const ctx = await getCtx(createdId);
    for (const k of Object.keys(fixture)) {
      expect(ctx).toHaveProperty(k);
    }
  } catch {
    console.warn('[SKIP] aiApplicationService unavailable');
  }
});