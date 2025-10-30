import express from 'express';
import { db } from '../db';
import { chatSessions, chatMessages } from '../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
const router = express.Router();
// GET /api/chat-sessions - Get all chat sessions with optional filtering
router.get('/', async (req, res) => {
    try {
        const { status, priority, assigned_to, limit = '50' } = req.query;
        console.log('🔔 [CHAT-SESSIONS] Fetching chat sessions with filters:', { status, priority, assigned_to, limit });
        const baseQuery = db
            .select({
            id: chatSessions.id,
            sessionId: chatSessions.sessionId,
            userName: chatSessions.userName,
            userEmail: chatSessions.userEmail,
            userPhone: chatSessions.userPhone,
            contactId: chatSessions.contactId,
            applicationId: chatSessions.applicationId,
            status: chatSessions.status,
            priority: chatSessions.priority,
            assignedStaffId: chatSessions.assignedStaffId,
            startedAt: chatSessions.startedAt,
            lastActivity: chatSessions.lastActivity,
            endedAt: chatSessions.endedAt,
            createdAt: chatSessions.createdAt,
            updatedAt: chatSessions.updatedAt,
            // Add message count
            messageCount: sql `(
          SELECT COUNT(*) FROM chat_messages 
          WHERE chat_messages.session_id = ${chatSessions.id}
        )`.as('messageCount')
        })
            .from(chatSessions);
        // Apply filters dynamically
        const conditions = [];
        if (status && status !== 'all') {
            conditions.push(eq(chatSessions.status, status));
        }
        if (priority && priority !== 'all') {
            conditions.push(eq(chatSessions.priority, priority));
        }
        if (assigned_to) {
            conditions.push(eq(chatSessions.assignedStaffId, assigned_to));
        }
        const query = conditions.length > 0
            ? baseQuery.where(and(...conditions))
            : baseQuery;
        const sessions = await query
            .orderBy(desc(chatSessions.lastActivity))
            .limit(parseInt(limit));
        console.log(`✅ [CHAT-SESSIONS] Found ${sessions.length} chat sessions`);
        res.json({
            success: true,
            data: sessions,
            count: sessions.length
        });
    }
    catch (error) {
        console.error('❌ [CHAT-SESSIONS] Error fetching chat sessions:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chat sessions'
        });
    }
});
// GET /api/chat-sessions/:id - Get specific chat session with messages
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('🔔 [CHAT-SESSIONS] Fetching chat session:', id);
        // Get session details
        const session = await db
            .select()
            .from(chatSessions)
            .where(eq(chatSessions.id, id))
            .limit(1);
        if (session.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Chat session not found'
            });
        }
        // Get messages for this session
        const messages = await db
            .select()
            .from(chatMessages)
            .where(eq(chatMessages.sessionId, id))
            .orderBy(chatMessages.sentAt);
        console.log(`✅ [CHAT-SESSIONS] Found session with ${messages.length} messages`);
        res.json({
            success: true,
            data: {
                session: session[0],
                messages: messages
            }
        });
    }
    catch (error) {
        console.error('❌ [CHAT-SESSIONS] Error fetching chat session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chat session'
        });
    }
});
// PATCH /api/chat-sessions/:id - Update chat session (assign staff, change status, etc.)
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assigned_staff_id, priority } = req.body;
        console.log('🔔 [CHAT-SESSIONS] Updating chat session:', id, { status, assigned_staff_id, priority });
        const updateData = {
            updatedAt: new Date()
        };
        if (status)
            updateData.status = status;
        if (assigned_staff_id !== undefined)
            updateData.assignedStaffId = assigned_staff_id;
        if (priority)
            updateData.priority = priority;
        // If assigning to staff or changing to active, update last activity
        if (assigned_staff_id || status === 'active') {
            updateData.lastActivity = new Date();
        }
        const updatedSession = await db
            .update(chatSessions)
            .set(updateData)
            .where(eq(chatSessions.id, id))
            .returning();
        if (updatedSession.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Chat session not found'
            });
        }
        console.log('✅ [CHAT-SESSIONS] Chat session updated successfully');
        res.json({
            success: true,
            data: updatedSession[0]
        });
    }
    catch (error) {
        console.error('❌ [CHAT-SESSIONS] Error updating chat session:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update chat session'
        });
    }
});
// POST /api/chat-sessions/:id/messages - Send a message to a chat session
router.post('/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { message, role = 'staff', staff_user_id } = req.body;
        console.log('🔔 [CHAT-SESSIONS] Adding message to session:', id, { role, message });
        // Add the message
        const newMessage = await db
            .insert(chatMessages)
            .values({
            sessionId: id,
            role: role,
            message: message,
            staffUserId: staff_user_id,
            sentAt: new Date()
        })
            .returning();
        // Update session last activity
        await db
            .update(chatSessions)
            .set({
            lastActivity: new Date(),
            status: 'active'
        })
            .where(eq(chatSessions.id, id));
        console.log('✅ [CHAT-SESSIONS] Message added successfully');
        res.json({
            success: true,
            data: newMessage[0]
        });
    }
    catch (error) {
        console.error('❌ [CHAT-SESSIONS] Error adding message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add message'
        });
    }
});
export default router;
