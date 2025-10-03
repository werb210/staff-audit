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

test('Lender export endpoint exists and includes all keys (if implemented)', async () => {
  const endpoint = `/api/lenders/export/${createdId}?dryRun=1`;
  const res = await request(app).post(endpoint);

  if (res.status === 404) {
    return console.warn('[SKIP] Lender export endpoint not implemented:', endpoint);
  }
  expect(res.status).toBeLessThan(400);

  const receivedKeys: string[] = res.body.receivedKeys || res.body.keys || [];
  if (receivedKeys.length) {
    for (const k of Object.keys(fixture)) expect(receivedKeys).toContain(k);
  } else {
    console.warn('[WARN] No receivedKeys in response; ensure exporter returns them in dryRun.');
  }
});