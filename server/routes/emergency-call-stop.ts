/**
 * Emergency Call Termination Endpoint
 * Immediately stops all active Twilio calls
 */

import { Router } from 'express';

const router = Router();

/**
 * POST /api/emergency/stop-all-calls
 * Terminates all active Twilio calls immediately
 */
router.post('/stop-all-calls', async (req: any, res: any) => {
  try {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return res.status(500).json({
        success: false,
        error: 'Twilio credentials not configured'
      });
    }

    const twilio = (await import('twilio')).default;
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    console.log('🚨 [EMERGENCY] Stopping all active calls...');

    // Get all in-progress calls
    const calls = await client.calls.list({
      status: 'in-progress',
      limit: 50
    });

    const stopPromises = calls.map(call => {
      console.log(`🛑 [EMERGENCY] Terminating call ${call.sid}: ${call.from} -> ${call.to}`);
      return client.calls(call.sid).update({ status: 'completed' });
    });

    const results = await Promise.allSettled(stopPromises);
    const stopped = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`✅ [EMERGENCY] Stopped ${stopped} calls, ${failed} failed`);

    res.json({
      success: true,
      message: `Emergency stop completed: ${stopped} calls terminated, ${failed} failed`,
      stopped,
      failed,
      totalCalls: calls.length
    });

  } catch (error: unknown) {
    console.error('❌ [EMERGENCY] Error stopping calls:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop calls',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/emergency/call-status
 * Check current call status without stopping
 */
router.get('/call-status', async (req: any, res: any) => {
  try {
    const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;
    
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return res.json({ error: 'Twilio not configured' });
    }

    const twilio = (await import('twilio')).default;
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

    const activeCalls = await client.calls.list({
      status: 'in-progress',
      limit: 20
    });

    const recentCalls = await client.calls.list({
      limit: 10
    });

    res.json({
      activeCalls: activeCalls.map(call => ({
        sid: call.sid,
        to: call.to,
        from: call.from,
        status: call.status,
        direction: call.direction,
        startTime: call.startTime
      })),
      recentCalls: recentCalls.map(call => ({
        sid: call.sid,
        to: call.to,
        from: call.from,
        status: call.status,
        direction: call.direction,
        startTime: call.startTime
      }))
    });

  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default router;