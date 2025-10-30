import express from 'express';
import { db } from '../db';
import { getGlobalIo } from '../websocket';
import { chatEscalations, chatIssueReports, insertChatEscalationSchema, insertChatIssueReportSchema, chatSessions, chatMessages, contacts, insertChatSessionSchema, insertChatMessageSchema } from '../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { callOpenAI } from '../utils/openai';
import { nanoid } from 'nanoid';

const router = express.Router();

/**
 * POST /api/public/chat/start
 * Start a new chat session
 */
router.post('/start', async (req: any, res: any) => {
  try {
    const { userId, applicationId, context } = req.body;

    console.log(`🚀 [CHAT-START] Starting new chat session`);
    
    // Generate a unique session ID
    const sessionId = `chat_${nanoid(12)}`;
    
    // Create chat session
    const sessionData = {
      sessionId,
      userName: context?.name || 'Anonymous User',
      userEmail: context?.email || null,
      userPhone: context?.phone || null,
      applicationId: applicationId || null,
      status: 'active',
      priority: 1,
      startedAt: new Date(),
      lastActivity: new Date()
    };

    // Use raw SQL to work around schema mismatch
    const sessionResult = await db.execute(sql`
      INSERT INTO chat_sessions (session_id, user_name, user_email, user_phone, status, priority, started_at, last_activity, updatedAt)
      VALUES (${sessionId}, ${sessionData.userName}, ${sessionData.userEmail}, ${sessionData.userPhone}, ${sessionData.status}, ${sessionData.priority}, ${sessionData.startedAt}, ${sessionData.lastActivity}, NOW())
      RETURNING id, session_id
    `);
    
    const session = sessionResult.rows[0];

    // Add initial system message using raw SQL
    await db.execute(sql`
      INSERT INTO chat_messages (session_id, role, message, sent_at)
      VALUES (${session.id}, 'system', 'Chat session started. How can I help you today?', NOW())
    `);

    console.log(`✅ [CHAT-START] Created session: ${sessionId}`);

    res.json({
      sessionId: session.id,
      success: true
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT-START] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start chat session',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * POST /api/public/chat/message
 * Send user messages and get AI responses
 */
router.post('/message', async (req: any, res: any) => {
  try {
    const { sessionId, message, language = 'en', context } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and message are required'
      });
    }

    console.log(`💬 [CHAT-MESSAGE] New message in session: ${sessionId}`);
    
    // Store user message using raw SQL
    await db.execute(sql`
      INSERT INTO chat_messages (session_id, role, message, sent_at)
      VALUES (${sessionId}, 'user', ${message}, NOW())
    `);

    // Update session activity using raw SQL
    await db.execute(sql`
      UPDATE chat_sessions SET last_activity = NOW() WHERE id = ${sessionId}
    `);

    // Get previous messages for context using raw SQL
    const previousMessagesResult = await db.execute(sql`
      SELECT role, message, sent_at FROM chat_messages 
      WHERE session_id = ${sessionId} 
      ORDER BY sent_at ASC 
      LIMIT 10
    `);
    const previousMessages = previousMessagesResult.rows;

    // Build AI prompt with context
    const conversationContext = previousMessages
      .slice(-5) // Last 5 messages for context
      .map(msg => `${msg.role}: ${msg.message}`)
      .join('\n');

    const aiPrompt = `
You are a helpful financial assistant for a lending platform. Respond to user questions professionally and helpfully.

${language === 'fr' ? 'Respond in French.' : 'Respond in English.'}

Previous conversation context:
${conversationContext}

Current user message: ${message}

Provide a helpful, professional response. If the user needs specific assistance that requires human help, suggest they can escalate to a human agent.
`;

    // Get AI response
    let aiResponse = 'I understand you need assistance. Let me help you with that.';
    let escalated = false;

    try {
      aiResponse = await callOpenAI(aiPrompt, 500);
      
      // Check if escalation might be needed
      const escalationKeywords = ['speak to human', 'talk to person', 'human agent', 'representative', 'complex issue'];
      escalated = escalationKeywords.some(keyword => 
        message.toLowerCase().includes(keyword) || aiResponse.toLowerCase().includes('escalate')
      );
      
    } catch (aiError) {
      console.warn('AI response failed, using fallback:', aiError);
      aiResponse = language === 'fr' 
        ? 'Je comprends que vous avez besoin d\'aide. Un représentant peut vous assister davantage.'
        : 'I understand you need assistance. A representative can help you further.';
    }

    // Store AI response using raw SQL
    await db.execute(sql`
      INSERT INTO chat_messages (session_id, role, message, sent_at)
      VALUES (${sessionId}, 'assistant', ${aiResponse}, NOW())
    `);

    console.log(`✅ [CHAT-MESSAGE] AI response generated for session: ${sessionId}`);

    res.json({
      response: aiResponse,
      escalated,
      success: true
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT-MESSAGE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * GET /api/public/chat/history/{sessionId}
 * Retrieve chat history
 */
router.get('/history/:sessionId', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;

    console.log(`📜 [CHAT-HISTORY] Fetching history for session: ${sessionId}`);
    
    // Get messages using raw SQL
    const messagesResult = await db.execute(sql`
      SELECT role, message, sent_at FROM chat_messages 
      WHERE session_id = ${sessionId} 
      ORDER BY sent_at ASC
    `);
    const messages = messagesResult.rows;

    const formattedMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.message,
      timestamp: new Date(msg.sent_at).toISOString()
    }));

    console.log(`✅ [CHAT-HISTORY] Retrieved ${messages.length} messages`);

    res.json({
      messages: formattedMessages,
      success: true
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT-HISTORY] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat history',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * POST /api/public/leads
 * Submit lead information from chatbot
 */
router.post('/leads', async (req: any, res: any) => {
  try {
    const { 
      name, 
      email, 
      phone,
      consent, 
      message,
      source = 'chat', 
      page, 
      tenant = 'boreal', 
      language = 'en',
      utmParams 
    } = req.body;

    if (!name || !email || consent !== true) {
      return res.status(400).json({
        success: false,
        error: 'name, email, and consent are required'
      });
    }

    console.log(`🎯 [CHAT-LEADS] New lead from chat: ${email}`);
    
    // Split name into first and last name
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // Store lead in contacts table using raw SQL
    const leadResult = await db.execute(sql`
      INSERT INTO contacts (full_name, first_name, last_name, email, phone, role, source, createdAt, updatedAt)
      VALUES (${name}, ${firstName}, ${lastName}, ${email}, ${phone || null}, 'Lead', ${source}, NOW(), NOW())
      RETURNING id, email
    `);
    const contact = leadResult.rows[0];

    // Log UTM parameters if provided
    if (utmParams) {
      console.log(`📊 [CHAT-LEADS] UTM params:`, utmParams);
    }

    console.log(`✅ [CHAT-LEADS] Created lead: ${contact.id}`);

    res.json({
      success: true,
      leadId: contact.id
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT-LEADS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create lead',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * POST /api/public/chat/escalate
 * Handle chatbot-to-human handoff escalation
 */
router.post('/escalate', async (req: any, res: any) => {
  try {
    const { sessionId, userName, userEmail, message, escalationReason, applicationId } = req.body;

    console.log(`🆘 [CHAT-ESCALATE] New escalation from session: ${sessionId}`);
    
    // Validate required fields
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: 'sessionId is required'
      });
    }

    // Insert escalation record using secure Drizzle insert
    const escalationData = insertChatEscalationSchema.parse({
      sessionId,
      userName: userName || 'Anonymous User',
      userEmail: userEmail || null,
      message: message || 'User requested human assistance',
      escalationReason: escalationReason || 'general_inquiry',
      applicationId: applicationId || null,
      status: 'pending'
    });

    const [escalationRecord] = await db.insert(chatEscalations)
      .values(escalationData)
      .returning();

    // Emit real-time notification to staff via WebSocket
    const io = getGlobalIo();
    if (io) {
      io.emit('chat:escalation', {
        escalationId: escalationRecord.id,
        sessionId,
        userName: userName || 'Anonymous User',
        userEmail,
        message,
        escalationReason,
        applicationId,
        timestamp: escalationRecord.createdAt
      });
      console.log(`🔄 [CHAT-ESCALATE] Real-time notification sent to staff`);
    }

    // Also emit to specific staff management room
    if (io) {
      io.to('staff-chat-management').emit('new-escalation', {
        id: escalationRecord.id,
        sessionId,
        userName: userName || 'Anonymous User',
        userEmail,
        message,
        escalationReason,
        applicationId,
        status: 'pending',
        createdAt: escalationRecord.createdAt
      });
    }

    console.log(`✅ [CHAT-ESCALATE] Created escalation: ${escalationRecord.id}`);

    res.json({
      success: true,
      escalationId: escalationRecord.id,
      sessionId,
      status: 'pending',
      message: 'Escalation created successfully. A staff member will assist you shortly.',
      timestamp: escalationRecord.createdAt
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT-ESCALATE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create chat escalation',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * POST /api/public/chat/report
 * Store issue report with timestamp
 */
router.post('/report', async (req: any, res: any) => {
  try {
    const { sessionId, userName, userEmail, issueType, description, severity, applicationId } = req.body;

    console.log(`📋 [CHAT-REPORT] New issue report from session: ${sessionId}`);
    
    // Validate required fields
    if (!sessionId || !issueType) {
      return res.status(400).json({
        success: false,
        error: 'sessionId and issueType are required'
      });
    }

    // Insert issue report using secure Drizzle insert
    const reportData = insertChatIssueReportSchema.parse({
      sessionId,
      userName: userName || 'Anonymous User',
      userEmail: userEmail || null,
      issueType,
      description: description || 'No description provided',
      severity: severity || 'medium',
      applicationId: applicationId || null,
      status: 'open'
    });

    const [reportRecord] = await db.insert(chatIssueReports)
      .values(reportData)
      .returning();

    // Emit real-time notification for high severity issues
    if (severity === 'high' || severity === 'critical') {
      const io = getGlobalIo();
      if (io) {
        io.emit('chat:high_priority_report', {
          reportId: reportRecord.id,
          sessionId,
          userName: userName || 'Anonymous User',
          userEmail,
          issueType,
          description,
          severity,
          applicationId,
          timestamp: reportRecord.createdAt
        });
        console.log(`🚨 [CHAT-REPORT] High priority alert sent to staff`);
      }
    }

    console.log(`✅ [CHAT-REPORT] Created issue report: ${reportRecord.id}`);

    res.json({
      success: true,
      reportId: reportRecord.id,
      sessionId,
      status: 'open',
      message: 'Issue report submitted successfully. Thank you for your feedback.',
      timestamp: reportRecord.createdAt
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT-REPORT] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create issue report',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * GET /api/chat/escalations
 * Get all chat escalations for staff dashboard
 */
router.get('/escalations', async (req: any, res: any) => {
  try {
    const { status, limit = 50 } = req.query;

    console.log(`📊 [CHAT-ESCALATIONS] Fetching escalations (status: ${status || 'all'})`);

    // Build query with proper Drizzle patterns
    let query = db.select().from(chatEscalations);
    
    if (status) {
      query = query.where(eq(chatEscalations.status, status as string));
    }
    
    const escalations = await query
      .orderBy(desc(chatEscalations.createdAt))
      .limit(parseInt(limit as string, 10));

    res.json({
      success: true,
      escalations,
      total: escalations.length,
      filters: { status, limit }
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT-ESCALATIONS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch chat escalations',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * GET /api/chat/issue-reports
 * Get all issue reports for staff dashboard
 */
router.get('/issue-reports', async (req: any, res: any) => {
  try {
    const { status, severity, limit = 50 } = req.query;

    console.log(`📊 [CHAT-REPORTS] Fetching issue reports`);

    // Build query with proper Drizzle patterns
    let query = db.select().from(chatIssueReports);
    
    const conditions = [];
    
    if (status) {
      conditions.push(eq(chatIssueReports.status, status as string));
    }
    
    if (severity) {
      conditions.push(eq(chatIssueReports.severity, severity as string));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const reports = await query
      .orderBy(desc(chatIssueReports.createdAt))
      .limit(parseInt(limit as string, 10));

    console.log(`✅ [CHAT-REPORTS] Retrieved ${reports.length} issue reports`);

    res.json({
      success: true,
      reports,
      total: reports.length,
      filters: { status, severity, limit }
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT-REPORTS] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch issue reports',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/chat/escalations/:id/status
 * Update escalation status (assign, resolve, etc.)
 */
router.patch('/escalations/:id/status', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, assignedStaffId, resolution } = req.body;

    console.log(`🔄 [CHAT-ESCALATION-UPDATE] Updating escalation ${id} to status: ${status}`);

    // Prepare update data with proper type handling
    const updateData: any = {
      status,
      updatedAt: new Date()
    };

    if (assignedStaffId !== undefined) {
      updateData.assignedStaffId = assignedStaffId || null;
    }

    if (resolution !== undefined) {
      updateData.resolution = resolution || null;
    }

    const [updatedEscalation] = await db.update(chatEscalations)
      .set(updateData)
      .where(eq(chatEscalations.id, id))
      .returning();

    if (!updatedEscalation) {
      return res.status(404).json({
        success: false,
        error: 'Escalation not found'
      });
    }

    console.log(`✅ [CHAT-ESCALATION-UPDATE] Updated escalation: ${id}`);

    res.json({
      success: true,
      escalation: updatedEscalation,
      message: 'Escalation status updated successfully'
    });

  } catch (error: unknown) {
    console.error('❌ [CHAT-ESCALATION-UPDATE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update escalation status',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * GET /api/chat/handoff-queue
 * Get handoff queue for chat management - FIXES 500 ERROR
 */
router.get('/handoff-queue', async (req: any, res: any) => {
  try {
    console.log('🔄 [HANDOFF-QUEUE] Fetching handoff queue...');
    
    // For now, return escalations as handoff queue since the frontend expects this endpoint
    const escalations = await db.select()
      .from(chatEscalations)
      .where(eq(chatEscalations.status, 'pending'))
      .orderBy(desc(chatEscalations.createdAt))
      .limit(50);

    console.log(`✅ [HANDOFF-QUEUE] Retrieved ${escalations.length} pending escalations`);

    res.json(escalations.map(escalation => ({
      id: escalation.id,
      sessionId: escalation.sessionId,
      priority: 'normal', // Default priority
      reason: escalation.escalationReason || 'general_inquiry',
      assignedTo: escalation.assignedStaffId,
      status: escalation.status,
      createdAt: escalation.createdAt,
      sessionName: escalation.userName,
      sessionEmail: escalation.userEmail,
      sessionStatus: 'active'
    })));

  } catch (error: unknown) {
    console.error('❌ [HANDOFF-QUEUE] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch handoff queue',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * POST /api/chat/request-staff
 * Handle staff assistance requests from client
 */
router.post('/request-staff', async (req: any, res: any) => {
  try {
    const { sessionId, userName, userEmail, message, requestType } = req.body;

    console.log(`🆘 [CHAT-REQUEST-STAFF] New staff request: ${sessionId}`);
    
    // Insert escalation record
    const escalationData = insertChatEscalationSchema.parse({
      sessionId: sessionId || `session_${Date.now()}`,
      userName: userName || 'Anonymous User',
      userEmail: userEmail || null,
      message: message || 'User requested staff assistance',
      escalationReason: requestType || 'staff_assistance',
      applicationId: null,
      status: 'pending'
    });

    const [escalationRecord] = await db.insert(chatEscalations)
      .values(escalationData)
      .returning();

    // Emit real-time notification to staff
    const io = getGlobalIo();
    if (io) {
      io.to('staff-chat-management').emit('staff-request', {
        id: escalationRecord.id,
        sessionId,
        userName: userName || 'Anonymous User',
        userEmail,
        message,
        requestType,
        status: 'pending',
        createdAt: escalationRecord.createdAt
      });
    }

    res.json({
      success: true,
      escalationId: escalationRecord.id,
      message: 'Staff assistance request received'
    });

  } catch (error: unknown) {
    console.error('Error handling staff request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process staff request'
    });
  }
});

/**
 * POST /api/chat/log-contact
 * Log contact interactions from client chat
 */
router.post('/log-contact', async (req: any, res: any) => {
  try {
    const { sessionId, userName, userEmail, action, details } = req.body;

    console.log(`📝 [CHAT-LOG-CONTACT] Logging contact: ${action} for ${userName}`);
    
    // For now, just log the contact interaction
    // This could be expanded to store in a dedicated table
    console.log(`Contact logged: ${JSON.stringify({ sessionId, userName, userEmail, action, details })}`);

    res.json({
      success: true,
      message: 'Contact interaction logged'
    });

  } catch (error: unknown) {
    console.error('Error logging contact:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log contact interaction'
    });
  }
});

/**
 * POST /api/chat/user-message
 * Handle user messages from client chat
 */
router.post('/user-message', async (req: any, res: any) => {
  try {
    const { sessionId, userName, userEmail, message, messageType } = req.body;

    console.log(`💬 [CHAT-USER-MESSAGE] New message from ${userName}: ${message}`);
    
    // Emit message to staff for real-time chat monitoring
    const io = getGlobalIo();
    if (io) {
      io.to('staff-chat-management').emit('user-message', {
        sessionId,
        userName: userName || 'Anonymous User',
        userEmail,
        message,
        messageType: messageType || 'text',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'User message received',
      sessionId
    });

  } catch (error: unknown) {
    console.error('Error handling user message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process user message'
    });
  }
});

export default router;