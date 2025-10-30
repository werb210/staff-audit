import express from 'express';
import { db } from '../db';
import { users } from '../../shared/schema';
import { authMiddleware } from '../auth';
import { eq, desc, and, sql, count } from 'drizzle-orm';
import { z } from 'zod';

const router = express.Router();

// Middleware for client authentication (lighter auth for logging)
const authenticateClient = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // For now, allow unauthenticated logging - in production you'd verify client tokens
  // This enables applicants to log conversations without full authentication
  next();
};

// Middleware for staff authentication (full auth required)
const authenticateStaff = authMiddleware;

// =================== CLIENT ENDPOINTS (Logging) ===================

// Start or resume a conversation session
router.post('/session/start', authenticateClient, async (req: any, res: any) => {
  try {
    const { sessionId, businessName, userEmail, userPhone } = req.body;
    
    // Validate input
    if (!businessName) {
      return res.status(400).json({ error: 'Business name is required' });
    }

    let session;
    
    if (sessionId) {
      // Try to find existing session
      const existingSessions = await db
        .select()
        .from(applicantSessions)
        .where(eq(applicantSessions.sessionId, sessionId))
        .limit(1);
      
      if (existingSessions.length > 0) {
        session = existingSessions[0];
        console.log('📝 AI Reports: Resumed session', sessionId, 'for', businessName);
      }
    }
    
    if (!session) {
      // Create new session
      const newSessions = await db
        .insert(applicantSessions)
        .values({
          businessName,
          userEmail: userEmail || null,
          userPhone: userPhone || null,
          status: 'active'
        })
        .returning();
      
      session = newSessions[0];
      console.log('📝 AI Reports: New session created', session.sessionId, 'for', businessName);
    }

    res.json({ 
      sessionId: session.sessionId,
      businessName: session.businessName,
      startTime: session.startTime
    });

  } catch (error: unknown) {
    console.error('AI Reports session start error:', error);
    res.status(500).json({ error: 'Failed to start session' });
  }
});

// Log a message in the conversation
router.post('/session/log', authenticateClient, async (req: any, res: any) => {
  try {
    const { sessionId, role, message, page } = req.body;
    
    // Validate input
    if (!sessionId || !role || !message) {
      return res.status(400).json({ error: 'Session ID, role, and message are required' });
    }

    if (!['user', 'bot'].includes(role)) {
      return res.status(400).json({ error: 'Role must be "user" or "bot"' });
    }

    // Insert message
    await db.insert(sessionMessages).values({
      sessionId,
      role,
      message,
      page: page || null
    });

    // Update session message count
    await db
      .update(applicantSessions)
      .set({ 
        updatedAt: new Date(),
        totalMessages: sql`${applicantSessions.totalMessages} + 1`
      })
      .where(eq(applicantSessions.sessionId, sessionId));

    console.log('📝 AI Reports: Message logged for session', sessionId, '- Role:', role);
    res.json({ status: 'ok' });

  } catch (error: unknown) {
    console.error('AI Reports message logging error:', error);
    res.status(500).json({ error: 'Failed to log message' });
  }
});

// =================== STAFF ENDPOINTS (Viewing/Management) ===================

// Get list of all conversation sessions for staff dashboard
router.get('/sessions', authenticateStaff, async (req: any, res: any) => {
  try {
    const { status, businessName, limit = '50' } = req.query;
    
    let query = db
      .select({
        sessionId: applicantSessions.sessionId,
        businessName: applicantSessions.businessName,
        userEmail: applicantSessions.userEmail,
        userPhone: applicantSessions.userPhone,
        startTime: applicantSessions.startTime,
        endTime: applicantSessions.endTime,
        totalMessages: applicantSessions.totalMessages,
        status: applicantSessions.status,
        updatedAt: applicantSessions.updatedAt
      })
      .from(applicantSessions);

    // Apply filters
    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(eq(applicantSessions.status, status as string));
    }
    if (businessName) {
      conditions.push(sql`${applicantSessions.businessName} ILIKE ${`%${businessName}%`}`);
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const sessions = await query
      .orderBy(desc(applicantSessions.startTime))
      .limit(parseInt(limit as string));

    console.log('📊 AI Reports: Staff retrieved', sessions.length, 'sessions');
    res.json({ sessions });

  } catch (error: unknown) {
    console.error('AI Reports sessions retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve sessions' });
  }
});

// Get full conversation detail for a specific session
router.get('/sessions/:sessionId', authenticateStaff, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;

    // Get session details
    const sessions = await db
      .select()
      .from(applicantSessions)
      .where(eq(applicantSessions.sessionId, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const session = sessions[0];

    // Get all messages for this session
    const messages = await db
      .select()
      .from(sessionMessages)
      .where(eq(sessionMessages.sessionId, sessionId))
      .orderBy(sessionMessages.timestamp);

    console.log('📖 AI Reports: Staff viewed session', sessionId, 'with', messages.length, 'messages');
    
    res.json({
      session,
      messages,
      messageCount: messages.length
    });

  } catch (error: unknown) {
    console.error('AI Reports session detail error:', error);
    res.status(500).json({ error: 'Failed to retrieve session details' });
  }
});

// Get summary statistics for dashboard
router.get('/stats/summary', authenticateStaff, async (req: any, res: any) => {
  try {
    // Total sessions
    const totalResult = await db
      .select({ count: count() })
      .from(applicantSessions);
    const total = totalResult[0]?.count || 0;

    // Active sessions
    const activeResult = await db
      .select({ count: count() })
      .from(applicantSessions)
      .where(eq(applicantSessions.status, 'active'));
    const active = activeResult[0]?.count || 0;

    // Recent sessions (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentResult = await db
      .select({ count: count() })
      .from(applicantSessions)
      .where(sql`${applicantSessions.startTime} >= ${oneDayAgo}`);
    const recent24h = recentResult[0]?.count || 0;

    // Total messages across all sessions
    const messagesResult = await db
      .select({ total: sql<number>`SUM(${applicantSessions.totalMessages})` })
      .from(applicantSessions);
    const totalMessages = messagesResult[0]?.total || 0;

    console.log('📊 AI Reports: Stats requested - Total sessions:', total, 'Active:', active);
    
    res.json({
      total_sessions: total,
      active_sessions: active,
      recent_24h: recent24h,
      total_messages: totalMessages,
      avg_messages_per_session: total > 0 ? Math.round(totalMessages / total) : 0
    });

  } catch (error: unknown) {
    console.error('AI Reports stats error:', error);
    res.status(500).json({ error: 'Failed to retrieve statistics' });
  }
});

// Mark session as completed
router.patch('/sessions/:sessionId/complete', authenticateStaff, async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;

    await db
      .update(applicantSessions)
      .set({ 
        status: 'completed',
        endTime: new Date(),
        updatedAt: new Date()
      })
      .where(eq(applicantSessions.sessionId, sessionId));

    console.log('✅ AI Reports: Session marked as completed:', sessionId);
    res.json({ status: 'completed' });

  } catch (error: unknown) {
    console.error('AI Reports session completion error:', error);
    res.status(500).json({ error: 'Failed to complete session' });
  }
});

// GET /api/ai-reports - List all issue reports (main endpoint for AI Reports page)
router.get('/', async (req: any, res: any) => {
  try {
    console.log('📊 [AI-REPORTS] Fetching all issue reports');
    
    const reportsResult = await db.execute(sql`
      SELECT 
        id,
        session_id,
        user_name,
        user_email,
        issue_type,
        description,
        severity,
        status,
        createdAt,
        updatedAt
      FROM chat_issue_reports
      ORDER BY createdAt DESC
      LIMIT 100
    `);
    
    const reports = reportsResult.rows || [];
    console.log(`📊 [AI-REPORTS] Retrieved ${reports.length} issue reports`);
    
    res.json(reports);
    
  } catch (error: unknown) {
    console.error('❌ [AI-REPORTS] Error fetching reports:', error);
    
    // Return empty array for missing table - don't crash the UI
    res.json([]);
  }
});

// Remove the broken applicantSessions references and just add the main route

export default router;