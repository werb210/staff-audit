import express from 'express';
import { emitChatRequest } from '../websocket';
// REMOVED: async (req: any, res: any) =>

const router = express.Router();

// Test endpoint to trigger chat request notifications
router.post('/trigger-chat-request', async (req: any, res) => {
  try {
    console.log('🧪 [TEST] Triggering chat request notification...');
    
    const testData = {
      sessionId: `test-session-${Date.now()}`,
      userName: req.body.userName || 'Test User',
      userEmail: req.body.userEmail || 'test@example.com',
      priority: req.body.priority || 'normal',
      timestamp: new Date().toISOString()
    };

    // Emit the chat request notification
    emitChatRequest(testData);

    res.json({
      success: true,
      message: 'Chat request notification sent',
      data: testData
    });

  } catch (error: unknown) {
    console.error('❌ [TEST] Error triggering notification:', error);
    res.status(500).json({
      error: 'Failed to trigger notification',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default router;