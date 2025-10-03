import { test, expect } from '@playwright/test';

/**
 * API Security Tests
 * Tests authentication walls and unauthorized access protection
 */
test.describe('API Security & Auth Walls - Production Security Fixes', () => {
  
  test('should return 401 for unauthenticated application requests', async ({ request }) => {
    const response = await request.get('/api/applications');
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('Authentication required');
  });

  test('should return 401 for unauthenticated document requests', async ({ request }) => {
    const response = await request.get('/api/documents');
    expect(response.status()).toBe(401);
  });

  test('should return 401 for cross-silo access attempts without valid auth', async ({ request }) => {
    // Test that SLF endpoints are protected by global auth guard
    const response = await request.get('/api/slf/contacts', {
      headers: {
        'Authorization': 'Bearer invalid-token'
      }
    });
    expect(response.status()).toBe(401);
    
    const body = await response.json();
    expect(body.error).toBe('Authentication required');
  });

  test('should protect SLF endpoints from unauthorized access', async ({ request }) => {
    const endpoints = [
      '/api/slf/contacts',
      '/api/slf/dialer',
      '/api/slf/analytics'
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    }
  });

  test('should protect admin endpoints', async ({ request }) => {
    const adminEndpoints = [
      '/api/admin/users',
      '/api/admin/system',
      '/api/lender-operations/analytics'
    ];

    for (const endpoint of adminEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
    }
  });

  test('should validate JWT token format', async ({ request }) => {
    const response = await request.get('/api/applications', {
      headers: {
        'Authorization': 'Bearer invalid-token-format'
      }
    });
    expect(response.status()).toBe(401);
  });

  test('🚨 SECURITY FIX: Global authentication guard blocks all protected endpoints', async ({ request }) => {
    // Test the global authentication middleware implemented for production vulnerability fix
    const protectedEndpoints = [
      '/api/applications',
      '/api/documents', 
      '/api/staff/users',
      '/api/crm/contacts',
      '/api/pipeline/summary',
      '/api/lender-operations/analytics'
    ];

    for (const endpoint of protectedEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(401);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Authentication required');
    }
  });

  test('🚨 SECURITY FIX: Whitelisted endpoints accessible without auth', async ({ request }) => {
    // Test endpoints that should be accessible without authentication
    const whitelistedEndpoints = [
      '/api/health',
      '/api/version',
      '/api/public/lenders-fallback',
      '/api/twilio/voice/health',
      '/api/twilio/voice/test'
    ];

    for (const endpoint of whitelistedEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status()).toBe(200);
    }
  });

  test('🚨 SECURITY FIX: Twilio voice webhook endpoints accessible', async ({ request }) => {
    // Test Twilio webhook endpoints that must be accessible for incoming calls
    const response1 = await request.post('/api/twilio/voice/inbound', {
      data: {
        From: '+1234567890',
        To: '+18254511768',
        CallSid: 'test-call-sid'
      }
    });
    expect(response1.status()).toBe(200);
    
    const response2 = await request.post('/api/twilio/voice/menu', {
      data: { Digits: '1' }
    });
    expect(response2.status()).toBe(200);

    const response3 = await request.post('/api/twilio/voice/recording', {
      data: { 
        RecordingUrl: 'https://test.twilio.com/recording.wav',
        RecordingSid: 'test-recording-sid'
      }
    });
    expect(response3.status()).toBe(200);
  });

  test('🚨 PRODUCTION VULNERABILITY: Previously exposed data is now protected', async ({ request }) => {
    // This test verifies the critical production vulnerability is fixed
    // Previously these endpoints returned 200 with actual data, now should return 401
    
    const vulnerableEndpoints = [
      '/api/applications',  // Was returning actual application data
      '/api/documents'      // Was returning actual document data  
    ];

    for (const endpoint of vulnerableEndpoints) {
      const response = await request.get(endpoint);
      
      // CRITICAL: Must return 401, not 200 with sensitive data
      expect(response.status()).toBe(401);
      
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBe('Authentication required');
      
      // Ensure no sensitive data is leaked
      expect(body.applications).toBeUndefined();
      expect(body.documents).toBeUndefined();
      expect(body.data).toBeUndefined();
    }
  });

  test('should reject expired tokens', async ({ request }) => {
    const expiredToken = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJPbmxpbmUgSldUIEJ1aWxkZXIiLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDAwMSwiYXVkIjoid3d3LmV4YW1wbGUuY29tIiwic3ViIjoianJvY2tldEBleGFtcGxlLmNvbSJ9.invalid';
    
    const response = await request.get('/api/applications', {
      headers: {
        'Authorization': `Bearer ${expiredToken}`
      }
    });
    expect(response.status()).toBe(401);
  });

  test('should enforce consistent 401 responses for protected endpoints', async ({ request }) => {
    // Make multiple requests to verify consistent security behavior
    const promises = Array(10).fill(0).map(() => 
      request.get('/api/applications')
    );
    
    const responses = await Promise.all(promises);
    
    // All should return 401 (authentication required)
    const unauthorizedResponses = responses.filter(r => r.status() === 401);
    expect(unauthorizedResponses.length).toBe(10);
  });
});