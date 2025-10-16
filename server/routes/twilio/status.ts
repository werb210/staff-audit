/**
 * Twilio Webhook Receipts - Feature 8
 * POST /api/twilio/status - Background delivery receipts
 */

import { Router } from 'express';

const router = Router();

// Feature 8: Handle webhook status receipts
router.post('/', async (req: any, res: any) => {
  try {
    const { 
      MessageSid, 
      MessageStatus, 
      To, 
      From, 
      CallSid, 
      CallStatus, 
      CallDuration 
    } = req.body;

    // Determine if this is an SMS or Call status update
    const isCallStatus = !!CallSid;
    const isSmsStatus = !!MessageSid;

    if (isCallStatus) {
      // Handle call status webhook
      console.log('📞 Call Status Update:', {
        sid: CallSid,
        status: CallStatus,
        duration: CallDuration,
        to: To,
        from: From,
        timestamp: new Date().toISOString()
      });

      // In production, update database with call status
      // await updateCallStatus(CallSid, CallStatus, CallDuration);

    } else if (isSmsStatus) {
      // Handle SMS status webhook
      console.log('📱 SMS Status Update:', {
        sid: MessageSid,
        status: MessageStatus,
        to: To,
        from: From,
        timestamp: new Date().toISOString()
      });

      // In production, update database with SMS status
      // await updateSmsStatus(MessageSid, MessageStatus);

      // Handle delivery failures
      if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
        console.log('⚠️ Message Delivery Failed:', {
          sid: MessageSid,
          to: To,
          status: MessageStatus
        });
        
        // In production, trigger retry logic or alert
        // await handleDeliveryFailure(MessageSid, To, MessageStatus);
      }

    } else {
      console.log('❓ Unknown Status Update:', req.body);
    }

    // Respond to Twilio webhook (always return 200)
    res.status(200).json({
      success: true,
      message: 'Status update processed successfully',
      processed: {
        type: isCallStatus ? 'call' : isSmsStatus ? 'sms' : 'unknown',
        sid: CallSid || MessageSid,
        status: CallStatus || MessageStatus,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: unknown) {
    console.error('❌ Status Webhook Error:', error);
    
    // Still return 200 to Twilio to prevent retries
    res.status(200).json({
      success: false,
      error: 'Failed to process status update',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get status history
router.get('/history', async (req: any, res: any) => {
  try {
    const { type, limit = 20 } = req.query;
    
    // In production, query database for status history
    const mockHistory = [
      {
        id: 'status_001',
        type: 'sms',
        sid: 'SM1234567890',
        status: 'delivered',
        to: '+15551234567',
        timestamp: new Date(Date.now() - 60000).toISOString()
      },
      {
        id: 'status_002',
        type: 'call',
        sid: 'CA1234567890',
        status: 'completed',
        to: '+15551234567',
        duration: 142,
        timestamp: new Date(Date.now() - 120000).toISOString()
      },
      {
        id: 'status_003',
        type: 'sms',
        sid: 'SM1234567891',
        status: 'failed',
        to: '+15559999999',
        errorCode: '21211',
        timestamp: new Date(Date.now() - 180000).toISOString()
      }
    ];

    let filteredHistory = mockHistory;
    if (type && type !== 'all') {
      filteredHistory = mockHistory.filter(item => item.type === type);
    }

    res.json({
      success: true,
      message: 'Status history retrieved successfully',
      data: {
        history: filteredHistory.slice(0, parseInt(limit as string)),
        total: filteredHistory.length
      }
    });

  } catch (error: unknown) {
    console.error('❌ Status History Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve status history',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get status statistics
router.get('/stats', async (req: any, res: any) => {
  try {
    // In production, calculate from database
    const stats = {
      sms: {
        total: 1250,
        delivered: 1198,
        failed: 45,
        pending: 7,
        deliveryRate: 95.8
      },
      calls: {
        total: 89,
        completed: 76,
        failed: 8,
        busy: 3,
        noAnswer: 2,
        completionRate: 85.4
      },
      otp: {
        total: 445,
        verified: 398,
        expired: 32,
        failed: 15,
        verificationRate: 89.4
      },
      costs: {
        totalSpent: 127.45,
        smsTotal: 93.75,
        callsTotal: 33.70,
        averagePerSms: 0.0075,
        averagePerCall: 0.025
      }
    };

    res.json({
      success: true,
      message: 'Status statistics retrieved successfully',
      data: stats
    });

  } catch (error: unknown) {
    console.error('❌ Status Stats Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve status statistics',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;