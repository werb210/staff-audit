/**
 * tests/publicFlow.spec.ts
 * ---------------------------------------------------------
 * Ensures the four public endpoints work without auth.
 * Start the backend (`npm run dev`) _before_ running Jest.
 */
import * as request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API = 'http://localhost:5000'; // change if different

describe('PUBLIC application flow (no auth cookie, no token)', () => {
  let appId: string;

  it('POST /api/public/applications → 200 + applicationId', async () => {
    const res = await request(API)
      .post('/api/public/applications')
      .send({
        business: {
          businessName: 'SmokeCo Ltd.',
          industry: 'Retail',
          annualRevenue: 500000,
          monthsInBusiness: 24
        },
        formFields: {
          fundingAmount: 50000,
          country: 'CA',
          useOfFunds: 'Working capital'
        }
      });

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.body.applicationId || res.body.data?.id).toBeTruthy();
    appId = res.body.applicationId || res.body.data?.id;
  });

  it('POST /api/public/upload/:id → 200 (multipart) ', async () => {
    const filePath = path.join(__dirname, 'fixtures', 'test.pdf');
    const res = await request(API)
      .post(`/api/public/upload/${appId}`)
      .attach('files', fs.readFileSync(filePath), 'test.pdf')
      .field('category', 'bank_statements');

    expect(res.status).toBe(200);
  });

  it('POST /api/public/applications/:id/initiate-signing → 200', async () => {
    const res = await request(API)
      .post(`/api/public/applications/${appId}/initiate-signing`)
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.signingUrl || res.body.data?.signingUrl).toMatch(/^https?:\/\//);
  });

  it('POST /api/public/applications/:id/submit → 200', async () => {
    const res = await request(API)
      .post(`/api/public/applications/${appId}/submit`)
      .send({ confirm: true });
    expect(res.status).toBe(200);
    expect(res.body.status || res.body.data?.status).toBe('submitted');
  });
});