import request from 'supertest';
import { app } from '../server/index';

describe('Authentication Regression Tests', () => {
  
  test('canonical login exists and responds correctly', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@test.com', password: 'wrongpassword' });
    
    // Should exist and handle bad credentials (400, 401, or 422 are acceptable)
    expect([400, 401, 422]).toContain(res.status);
    expect(res.headers['x-auth-source']).toBe('canonical-auth');
  });

  test('legacy route is blocked', async () => {
    const res = await request(app).post('/api/login');
    expect(res.status).toBe(404);
    expect(res.body.error).toContain('Legacy auth path blocked');
  });

  test('non-canonical auth routes are blocked', async () => {
    const res1 = await request(app).post('/api/auth');
    expect(res1.status).toBe(404);
    
    const res2 = await request(app).post('/auth/login');
    expect(res2.status).toBe(404);
  });

  test('probe endpoint is accessible', async () => {
    const res = await request(app).get('/api/auth/__probe');
    expect(res.status).toBeLessThan(400);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('canonical-auth');
    expect(res.body.canonical).toBe(true);
  });

  test('route dump shows exactly one login route', async () => {
    const res = await request(app).get('/__route_dump');
    expect(res.status).toBe(200);
    
    const routes = res.text.split('\n');
    const loginRoutes = routes.filter(route => route.includes('/api/auth/login'));
    expect(loginRoutes).toHaveLength(1);
    expect(loginRoutes[0]).toContain('POST');
  });

  test('canonical login has correct auth header', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'any', password: 'any' });
    
    expect(res.headers['x-auth-source']).toBe('canonical-auth');
  });

  test('firewall blocks legacy paths with proper error messages', async () => {
    const res = await request(app).post('/api/login');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Legacy auth path blocked. Use /api/auth/login');
  });

});