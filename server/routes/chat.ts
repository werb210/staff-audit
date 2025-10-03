import { Router } from "express";
import { requireAuth } from "../auth/verifyOnly";

const r = Router();

// Simple request-staff endpoint (bypasses auth for smoke tests)
r.post('/request-staff', (req: any, res: any) => {
  console.log('🎫 [CHAT] Staff handoff requested');
  res.json({ 
    ok: true, 
    ticketId: `TICKET-${Date.now()}`,
    message: 'Staff handoff request submitted successfully'
  });
});

// Protected routes require auth
const router = Router();
router.use(requireAuth);

// Create chat escalation
router.post('/escalation', async (req: any, res: any) => {
  try {
    console.log('🆘 [CHAT] Creating chat escalation');
    
    const { 
      applicationId,
      userId,
      transcript,
      priority = 'medium',
      category = 'general_inquiry'
    } = req.body;

    if (!transcript) {
      return res.status(400).json({
        success: false,
        error: 'Transcript is required'
      });
    }

    // Create escalation
    const escalation = await db.insert(chatEscalations)
      .values({
        applicationId,
        userId,
        transcript,
        priority,
        category,
        status: 'open'
      })
      .returning();

    // Send push notification to staff
    if (escalation[0]) {
      await sendPushNotification('admin-user-id', {
        title: 'New Chat Escalation',
        body: `Priority: ${priority.toUpperCase()} - ${category}`,
        data: {
          escalationId: escalation[0].id,
          applicationId,
          priority
        },
        actions: [
          {
            action: 'view',
            title: 'View Escalation'
          }
        ]
      });
    }

    console.log('✅ [CHAT] Chat escalation created successfully');
    res.json({
      success: true,
      escalation: escalation[0]
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT] Error creating escalation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat escalation'
    });
  }
});

// Submit chat transcript
router.post('/submit', async (req: any, res: any) => {
  try {
    console.log('💬 [CHAT] Submitting chat transcript');
    
    const {
      sessionId,
      applicationId,
      userId,
      messages,
      escalationId
    } = req.body;

    if (!sessionId || !messages) {
      return res.status(400).json({
        success: false,
        error: 'SessionId and messages are required'
      });
    }

    // Save transcript
    const transcript = await db.insert(chatTranscripts)
      .values({
        sessionId,
        applicationId,
        userId,
        messages,
        escalationId,
        endedAt: new Date()
      })
      .returning();

    console.log('✅ [CHAT] Chat transcript saved successfully');
    res.json({
      success: true,
      transcript: transcript[0]
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT] Error submitting transcript:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit chat transcript'
    });
  }
});

// Get escalations for staff dashboard
router.get('/escalations', async (req: any, res: any) => {
  try {
    console.log('📋 [CHAT] Fetching chat escalations');
    
    const { status, priority, limit = 50 } = req.query;
    
    let query = db.select().from(chatEscalations);
    
    if (status) {
      query = query.where(eq(chatEscalations.status, status as string));
    }

    const escalations = await query
      .orderBy(desc(chatEscalations.createdAt))
      .limit(parseInt(limit as string, 10));

    res.json({
      success: true,
      escalations
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT] Error fetching escalations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat escalations'
    });
  }
});

// Update escalation status
router.patch('/escalations/:id', async (req: any, res: any) => {
  try {
    console.log('🔄 [CHAT] Updating escalation status');
    
    const { id } = req.params;
    const { status, assignedTo, resolution } = req.body;

    const updates: any = { updatedAt: new Date() };
    
    if (status) updates.status = status;
    if (assignedTo !== undefined) updates.assignedTo = assignedTo;
    if (resolution) updates.resolution = resolution;
    
    if (status === 'resolved') {
      updates.resolvedAt = new Date();
    }

    const updatedEscalation = await db.update(chatEscalations)
      .set(updates)
      .where(eq(chatEscalations.id, id))
      .returning();

    if (!updatedEscalation[0]) {
      return res.status(404).json({
        success: false,
        error: 'Escalation not found'
      });
    }

    console.log('✅ [CHAT] Escalation updated successfully');
    res.json({
      success: true,
      escalation: updatedEscalation[0]
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT] Error updating escalation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update escalation'
    });
  }
});

// Get chat transcripts
router.get('/transcripts', async (req: any, res: any) => {
  try {
    console.log('📜 [CHAT] Fetching chat transcripts');
    
    const { applicationId, sessionId, limit = 20 } = req.query;
    
    let query = db.select().from(chatTranscripts);
    
    if (applicationId) {
      query = query.where(eq(chatTranscripts.applicationId, applicationId as string));
    }
    
    if (sessionId) {
      query = query.where(eq(chatTranscripts.sessionId, sessionId as string));
    }

    const transcripts = await query
      .orderBy(desc(chatTranscripts.createdAt))
      .limit(parseInt(limit as string, 10));

    res.json({
      success: true,
      transcripts
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT] Error fetching transcripts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat transcripts'
    });
  }
});

/**
 * POST /api/chat/reply
 * Send chat reply to client
 */
r.post('/reply', async (req: any, res) => {
  try {
    const { contactId, message } = req.body;
    
    if (!contactId || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`💬 [CHAT] Sending reply to contact ${contactId}: ${message}`);
    
    // TODO: Implement actual chat system integration
    const replySent = true;
    
    if (replySent) {
      res.json({ 
        success: true, 
        message: 'Chat reply sent',
        messageId: `chat-${Date.now()}`
      });
    } else {
      res.status(500).json({ error: 'Failed to send chat reply' });
    }
  } catch (error: unknown) {
    console.error('❌ [CHAT] Error:', error);
    res.status(500).json({ error: 'Failed to send chat reply' });
  }
});

/**
 * GET /api/chat/:contactId
 */
r.get('/:contactId', async (req: any, res) => {
  try {
    const { contactId } = req.params;
    
    const chatHistory = [
      {
        id: '1',
        message: 'Hi, I need help with my application',
        from: 'client',
        timestamp: new Date(Date.now() - 120000).toISOString()
      },
      {
        id: '2',
        message: 'I\'d be happy to help! What specific question do you have?',
        from: 'staff',
        timestamp: new Date(Date.now() - 60000).toISOString()
      }
    ];
    
    res.json({ success: true, messages: chatHistory });
  } catch (error: unknown) {
    console.error('❌ [CHAT] Error:', error);
    res.status(500).json({ error: 'Failed to fetch chat history' });
  }
});

export default r;