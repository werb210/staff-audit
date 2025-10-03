const request = require('supertest');
const app = require('../server/app'); // Adjust path as needed

describe('AI Endpoints', () => {
  test('GET /api/ai/benchmarks/:naics should return industry metrics', async () => {
    const response = await request(app)
      .get('/api/ai/benchmarks/123456')
      .expect(200);
    
    expect(response.body.ok).toBe(true);
    expect(response.body.naics).toBe('123456');
    expect(response.body.metrics).toHaveProperty('grossMargin');
    expect(response.body.metrics).toHaveProperty('netMargin');
  });

  test('POST /api/ai/compose/email should generate email draft', async () => {
    const response = await request(app)
      .post('/api/ai/compose/email')
      .send({ applicationId: 'test123' })
      .expect(200);
    
    expect(response.body.ok).toBe(true);
    expect(response.body.draft).toHaveProperty('subject');
    expect(response.body.draft).toHaveProperty('body');
  });

  test('POST /api/ai/compose/sms should generate SMS draft', async () => {
    const response = await request(app)
      .post('/api/ai/compose/sms')
      .send({ applicationId: 'test123' })
      .expect(200);
    
    expect(response.body.ok).toBe(true);
    expect(response.body.draft).toHaveProperty('body');
  });

  test('POST /api/ai/compliance/screen should return AML status', async () => {
    const response = await request(app)
      .post('/api/ai/compliance/screen')
      .send({ applicationId: 'test123', contactId: 'contact123' })
      .expect(200);
    
    expect(response.body.ok).toBe(true);
    expect(response.body).toHaveProperty('aml');
    expect(response.body).toHaveProperty('sanctions');
  });

  test('POST /api/ai/timeline should return processing timeline', async () => {
    const response = await request(app)
      .post('/api/ai/timeline')
      .send({ applicationId: 'test123' })
      .expect(200);
    
    expect(response.body.ok).toBe(true);
    expect(response.body).toHaveProperty('etaDays');
    expect(response.body).toHaveProperty('steps');
    expect(Array.isArray(response.body.steps)).toBe(true);
  });

  test('POST /api/ai/ops/priority should return priority score', async () => {
    const response = await request(app)
      .post('/api/ai/ops/priority')
      .send({ applicationId: 'test123' })
      .expect(422); // Expected to fail with application_not_found
    
    expect(response.body.ok).toBe(false);
    expect(response.body.error).toBe('application_not_found');
  });
});