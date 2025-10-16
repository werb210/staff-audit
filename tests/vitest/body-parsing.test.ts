import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';

// Mock the app setup to test body parsing
const createTestApp = () => {
  const app = express();
  
  // Test middleware order - body parsing must come before routes
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));
  
  // Test route that requires body parsing
  app.post('/api/test/body', (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'body_parsing_failed', body: req.body });
    }
    
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    
    res.json({ success: true, received: { email, password: '***' } });
  });
  
  return app;
};

describe('Body Parsing Middleware', () => {
  const app = createTestApp();
  
  it('should parse JSON body correctly', async () => {
    const response = await request(app)
      .post('/api/test/body')
      .send({ email: 'test@example.com', password: 'test123' })
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.received.email).toBe('test@example.com');
  });
  
  it('should return 400 for missing body', async () => {
    const response = await request(app)
      .post('/api/test/body')
      .send({})
      .expect(400);
    
    expect(response.body.error).toBe('missing_fields');
  });
  
  it('should return 400 for missing fields', async () => {
    const response = await request(app)
      .post('/api/test/body')
      .send({ email: 'test@example.com' })
      .expect(400);
    
    expect(response.body.error).toBe('missing_fields');
  });
});

describe('Auth Endpoint Body Parsing Integration', () => {
  it('should handle login endpoint with proper JSON body', async () => {
    // This test verifies the actual login endpoint handles JSON correctly
    const response = await request('http://localhost:5000')
      .post('/api/auth/login')
      .send({ email: 'invalid@test.com', password: 'invalid' })
      .expect(401);
    
    // Should get 401 (unauthorized) not 415 (unsupported media type) or 400 (bad request due to undefined body)
    expect(response.body.error).toBe('invalid_credentials');
  });
});