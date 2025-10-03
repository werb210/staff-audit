import { test, expect } from '@playwright/test';

test.describe('OTP Destination Security', () => {
  const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

  test('OTP goes to profile phone only - blocks client-provided phone', async ({ request }) => {
    // Attempt to send OTP with wrong phone number - should be blocked
    const wrongPhoneResponse = await request.post(`${baseUrl}/api/auth/request-2fa`, {
      data: { 
        email: 'todd.w@boreal.financial', 
        phoneNumber: '+15555550123' // Wrong/test number
      }
    });

    expect(wrongPhoneResponse.status()).toBe(400);
    const wrongPhoneData = await wrongPhoneResponse.json();
    expect(wrongPhoneData.error).toBe('phone_mismatch_use_profile');
  });

  test('OTP accepts profile phone from server', async ({ request }) => {
    // Send OTP request with only email - server should resolve profile phone
    const correctResponse = await request.post(`${baseUrl}/api/auth/request-2fa`, {
      data: { 
        email: 'todd.w@boreal.financial'
        // No phoneNumber provided - server uses profile
      }
    });

    expect(correctResponse.status()).toBe(200);
    const correctData = await correctResponse.json();
    expect(correctData.success).toBe(true);
    expect(correctData.message).toContain('sent successfully');
  });

  test('Production blocks test numbers', async ({ request }) => {
    // Skip if not in production mode
    if (process.env.NODE_ENV !== 'production') {
      test.skip('Only runs in production environment');
    }

    const testNumberResponse = await request.post(`${baseUrl}/api/auth/request-2fa`, {
      data: { 
        email: 'test@example.com',
        phoneNumber: '+15005550006' // Known test number
      }
    });

    expect(testNumberResponse.status()).toBe(400);
    const testData = await testNumberResponse.json();
    expect(testData.error).toBe('test_number_blocked');
  });

  test('Verify endpoint enforces same phone security', async ({ request }) => {
    // Attempt to verify with different phone than profile
    const verifyResponse = await request.post(`${baseUrl}/api/auth/verify-2fa`, {
      data: {
        email: 'todd.w@boreal.financial',
        phoneNumber: '+15555550123', // Wrong phone
        code: '123456'
      }
    });

    expect(verifyResponse.status()).toBe(400);
    const verifyData = await verifyResponse.json();
    expect(verifyData.error).toBe('phone_mismatch_use_profile');
  });
});