/**
 * SECURE Chat Routes - Production Hardened Version
 * Addresses SQL injection, input validation, rate limiting, and other security issues
 */
import express from 'express';
import { db } from '../db';
import { getGlobalIo } from '../websocket';
import { chatEscalations, chatIssueReports, insertChatEscalationSchema, insertChatIssueReportSchema } from '../../shared/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import { callOpenAI } from '../utils/openai';
import { nanoid } from 'nanoid';
// Security imports
import { validateSessionId, validateMessage, validateName, validateEmail, validatePhone, validateLanguage, validateConsent, validateEscalationReason, sanitizeText } from '../utils/security-validation';
import { chatStartLimiter, chatMessageLimiter, chatHistoryLimiter, leadsLimiter, escalationLimiter, reportLimiter, dashboardLimiter, generalLimiter } from '../middleware/chatRateLimit';
const router = express.Router();
/**
 * POST /api/public/chat/start
 * Start a new chat session - SECURED
 */
router.post('/start', chatStartLimiter, async (req, res) => {
    try {
        console.log(`🚀 [CHAT-START] Starting new chat session from IP: ${req.ip}`);
        const { userId, applicationId, context } = req.body;
        // Validate and sanitize inputs
        let validatedName = 'Anonymous User';
        let validatedEmail = null;
        let validatedPhone = null;
        if (context?.name) {
            try {
                validatedName = validateName(context.name);
            }
            catch (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid name format'
                });
            }
        }
        if (context?.email) {
            try {
                validatedEmail = validateEmail(context.email);
            }
            catch (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
            }
        }
        if (context?.phone) {
            try {
                validatedPhone = validatePhone(context.phone);
            }
            catch (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid phone format'
                });
            }
        }
        // Generate a secure session ID
        const sessionId = `chat_${nanoid(12)}`;
        // Use safe parameterized SQL to work with existing database structure
        const sessionResult = await db.execute(sql `
      INSERT INTO chat_sessions (session_id, user_name, user_email, user_phone, status, priority, started_at, last_activity, updatedAt)
      VALUES (${sessionId}, ${validatedName}, ${validatedEmail}, ${validatedPhone}, ${'active'}, ${1}, ${new Date()}, ${new Date()}, NOW())
      RETURNING id, session_id
    `);
        const session = sessionResult.rows[0];
        // Add initial system message using safe parameterized SQL
        await db.execute(sql `
      INSERT INTO chat_messages (session_id, role, message, sent_at)
      VALUES (${session.id}, ${'system'}, ${'Chat session started. How can I help you today?'}, NOW())
    `);
        console.log(`✅ [CHAT-START] Created session: ${sessionId}`);
        res.json({
            sessionId: session.id,
            success: true
        });
    }
    catch (error) {
        console.error('❌ [CHAT-START] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to start chat session'
            // Removed detailed error message for security
        });
    }
});
/**
 * POST /api/public/chat/message
 * Send user messages and get AI responses - SECURED
 */
router.post('/message', chatMessageLimiter, async (req, res) => {
    try {
        const { sessionId, message, language = 'en', context } = req.body;
        // Validate required fields
        if (!sessionId || !message) {
            return res.status(400).json({
                success: false,
                error: 'sessionId and message are required'
            });
        }
        // Validate and sanitize inputs
        let validatedSessionId;
        let validatedMessage;
        let validatedLanguage;
        try {
            validatedSessionId = validateSessionId(sessionId);
            validatedMessage = validateMessage(message);
            validatedLanguage = validateLanguage(language);
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Invalid input'
            });
        }
        console.log(`💬 [CHAT-MESSAGE] New message in session: ${validatedSessionId}`);
        // Verify session exists and is active using safe parameterized query
        const sessionCheck = await db.execute(sql `
      SELECT id, status FROM chat_sessions WHERE id = ${validatedSessionId} LIMIT 1
    `);
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        if (sessionCheck.rows[0].status !== 'active') {
            return res.status(400).json({
                success: false,
                error: 'Session is not active'
            });
        }
        // Store user message using safe parameterized SQL
        await db.execute(sql `
      INSERT INTO chat_messages (session_id, role, message, sent_at)
      VALUES (${validatedSessionId}, ${'user'}, ${validatedMessage}, NOW())
    `);
        // Update session activity using safe parameterized SQL
        await db.execute(sql `
      UPDATE chat_sessions SET last_activity = NOW() WHERE id = ${validatedSessionId}
    `);
        // Get previous messages for context using safe parameterized query
        const previousMessagesResult = await db.execute(sql `
      SELECT role, message, sent_at FROM chat_messages 
      WHERE session_id = ${validatedSessionId} 
      ORDER BY sent_at ASC 
      LIMIT 10
    `);
        const previousMessages = previousMessagesResult.rows;
        // Build AI prompt with sanitized context
        const conversationContext = previousMessages
            .slice(-5) // Last 5 messages for context
            .map(msg => `${msg.role}: ${msg.message}`)
            .join('\n');
        const aiPrompt = `
You are a helpful financial assistant for a lending platform. Respond to user questions professionally and helpfully.

${validatedLanguage === 'fr' ? 'Respond in French.' : 'Respond in English.'}

Previous conversation context:
${conversationContext}

Current user message: ${validatedMessage}

Provide a helpful, professional response. If the user needs specific assistance that requires human help, suggest they can escalate to a human agent.
`;
        // Get AI response with error handling
        let aiResponse = 'I understand you need assistance. Let me help you with that.';
        let escalated = false;
        try {
            aiResponse = await callOpenAI(aiPrompt, 500);
            // Check if escalation might be needed
            const escalationKeywords = ['speak to human', 'talk to person', 'human agent', 'representative', 'complex issue'];
            escalated = escalationKeywords.some(keyword => validatedMessage.toLowerCase().includes(keyword) || aiResponse.toLowerCase().includes('escalate'));
        }
        catch (aiError) {
            console.warn('AI response failed, using fallback:', aiError);
            aiResponse = validatedLanguage === 'fr'
                ? 'Je comprends que vous avez besoin d\'aide. Un représentant peut vous assister davantage.'
                : 'I understand you need assistance. A representative can help you further.';
        }
        // Store AI response using safe parameterized SQL
        await db.execute(sql `
      INSERT INTO chat_messages (session_id, role, message, sent_at)
      VALUES (${validatedSessionId}, ${'assistant'}, ${aiResponse}, NOW())
    `);
        console.log(`✅ [CHAT-MESSAGE] AI response generated for session: ${validatedSessionId}`);
        res.json({
            response: aiResponse,
            escalated,
            success: true
        });
    }
    catch (error) {
        console.error('❌ [CHAT-MESSAGE] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process chat message'
            // Removed detailed error message for security
        });
    }
});
/**
 * GET /api/public/chat/history/{sessionId}
 * Retrieve chat history - SECURED
 */
router.get('/history/:sessionId', chatHistoryLimiter, async (req, res) => {
    try {
        const { sessionId } = req.params;
        // Validate session ID
        let validatedSessionId;
        try {
            validatedSessionId = validateSessionId(sessionId);
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: 'Invalid session ID format'
            });
        }
        console.log(`📜 [CHAT-HISTORY] Fetching history for session: ${validatedSessionId}`);
        // Verify session exists using safe parameterized query
        const sessionCheck = await db.execute(sql `
      SELECT id FROM chat_sessions WHERE id = ${validatedSessionId} LIMIT 1
    `);
        if (sessionCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Session not found'
            });
        }
        // Get messages using safe parameterized query
        const messagesResult = await db.execute(sql `
      SELECT role, message, sent_at FROM chat_messages 
      WHERE session_id = ${validatedSessionId} 
      ORDER BY sent_at ASC
    `);
        const messages = messagesResult.rows;
        const formattedMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.message,
            timestamp: msg.sentAt.toISOString()
        }));
        console.log(`✅ [CHAT-HISTORY] Retrieved ${messages.length} messages`);
        res.json({
            messages: formattedMessages,
            success: true
        });
    }
    catch (error) {
        console.error('❌ [CHAT-HISTORY] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chat history'
            // Removed detailed error message for security
        });
    }
});
/**
 * POST /api/public/chat/leads
 * Submit lead information from chatbot - SECURED
 */
router.post('/leads', leadsLimiter, async (req, res) => {
    try {
        const { name, email, phone, consent, message, source = 'chat', page, tenant = 'boreal', language = 'en', utmParams } = req.body;
        // Validate required fields
        if (!name || !email || !validateConsent(consent)) {
            return res.status(400).json({
                success: false,
                error: 'name, email, and consent are required'
            });
        }
        // Validate and sanitize all inputs
        let validatedName;
        let validatedEmail;
        let validatedPhone;
        let validatedMessage;
        try {
            validatedName = validateName(name);
            validatedEmail = validateEmail(email);
            validatedPhone = validatePhone(phone);
            validatedMessage = message ? sanitizeText(message, 500) : '';
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Invalid input'
            });
        }
        console.log(`🎯 [CHAT-LEADS] New lead from chat: ${validatedEmail}`);
        // Split name into first and last name
        const nameParts = validatedName.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        // Store lead using safe parameterized SQL
        const leadResult = await db.execute(sql `
      INSERT INTO contacts (full_name, first_name, last_name, email, phone, role, source, createdAt, updatedAt)
      VALUES (${validatedName}, ${firstName}, ${lastName}, ${validatedEmail}, ${validatedPhone}, ${'Lead'}, ${'chat'}, NOW(), NOW())
      RETURNING id, email
    `);
        const contact = leadResult.rows[0];
        // Log UTM parameters safely (no sensitive data)
        if (utmParams) {
            console.log(`📊 [CHAT-LEADS] UTM params logged for lead: ${contact.id}`);
        }
        console.log(`✅ [CHAT-LEADS] Created lead: ${contact.id}`);
        res.json({
            success: true,
            leadId: contact.id
        });
    }
    catch (error) {
        console.error('❌ [CHAT-LEADS] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create lead'
            // Removed detailed error message for security
        });
    }
});
/**
 * POST /api/public/chat/escalate
 * Handle chatbot-to-human handoff escalation - SECURED
 */
router.post('/escalate', escalationLimiter, async (req, res) => {
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
        // Validate and sanitize inputs
        let validatedSessionId;
        let validatedUserName;
        let validatedUserEmail;
        let validatedMessage;
        let validatedReason;
        try {
            validatedSessionId = validateSessionId(sessionId);
            validatedUserName = userName ? validateName(userName) : 'Anonymous User';
            validatedUserEmail = userEmail ? validateEmail(userEmail) : null;
            validatedMessage = message ? sanitizeText(message, 1000) : 'User requested human assistance';
            validatedReason = validateEscalationReason(escalationReason);
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Invalid input'
            });
        }
        // Insert escalation record using secure ORM
        const escalationData = insertChatEscalationSchema.parse({
            sessionId: validatedSessionId,
            userName: validatedUserName,
            userEmail: validatedUserEmail,
            message: validatedMessage,
            escalationReason: validatedReason,
            applicationId: applicationId || null,
            status: 'pending'
        });
        const [escalationRecord] = await db.insert(chatEscalations)
            .values(escalationData)
            .returning();
        // Emit real-time notification to staff via WebSocket (sanitized)
        const io = getGlobalIo();
        if (io) {
            io.emit('chat:escalation', {
                escalationId: escalationRecord.id,
                sessionId: validatedSessionId,
                userName: validatedUserName,
                userEmail: validatedUserEmail,
                escalationReason: validatedReason,
                timestamp: escalationRecord.createdAt
            });
            console.log(`🔄 [CHAT-ESCALATE] Real-time notification sent to staff`);
        }
        console.log(`✅ [CHAT-ESCALATE] Created escalation: ${escalationRecord.id}`);
        res.json({
            success: true,
            escalationId: escalationRecord.id,
            sessionId: validatedSessionId,
            status: 'pending',
            message: 'Escalation created successfully. A staff member will assist you shortly.',
            timestamp: escalationRecord.createdAt
        });
    }
    catch (error) {
        console.error('❌ [CHAT-ESCALATE] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create chat escalation'
            // Removed detailed error message for security
        });
    }
});
/**
 * POST /api/public/chat/report
 * Store issue report with timestamp - SECURED
 */
router.post('/report', reportLimiter, async (req, res) => {
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
        // Validate and sanitize inputs
        let validatedSessionId;
        let validatedUserName;
        let validatedUserEmail;
        let validatedDescription;
        try {
            validatedSessionId = validateSessionId(sessionId);
            validatedUserName = userName ? validateName(userName) : 'Anonymous User';
            validatedUserEmail = userEmail ? validateEmail(userEmail) : null;
            validatedDescription = description ? sanitizeText(description, 2000) : 'No description provided';
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Invalid input'
            });
        }
        // Validate issue type and severity
        const allowedIssueTypes = ['technical', 'billing', 'feature_request', 'bug', 'complaint', 'general'];
        const allowedSeverities = ['low', 'medium', 'high', 'critical'];
        if (!allowedIssueTypes.includes(issueType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid issue type'
            });
        }
        const validatedSeverity = allowedSeverities.includes(severity) ? severity : 'medium';
        // Insert issue report using secure ORM
        const reportData = insertChatIssueReportSchema.parse({
            sessionId: validatedSessionId,
            userName: validatedUserName,
            userEmail: validatedUserEmail,
            issueType,
            description: validatedDescription,
            severity: validatedSeverity,
            applicationId: applicationId || null,
            status: 'open'
        });
        const [reportRecord] = await db.insert(chatIssueReports)
            .values(reportData)
            .returning();
        // Emit real-time notification for high severity issues (sanitized data)
        if (validatedSeverity === 'high' || validatedSeverity === 'critical') {
            const io = getGlobalIo();
            if (io) {
                io.emit('chat:high_priority_report', {
                    reportId: reportRecord.id,
                    sessionId: validatedSessionId,
                    userName: validatedUserName,
                    issueType,
                    severity: validatedSeverity,
                    timestamp: reportRecord.createdAt
                });
                console.log(`🚨 [CHAT-REPORT] High priority alert sent to staff`);
            }
        }
        console.log(`✅ [CHAT-REPORT] Created issue report: ${reportRecord.id}`);
        res.json({
            success: true,
            reportId: reportRecord.id,
            sessionId: validatedSessionId,
            status: 'open',
            message: 'Issue report submitted successfully. Thank you for your feedback.',
            timestamp: reportRecord.createdAt
        });
    }
    catch (error) {
        console.error('❌ [CHAT-REPORT] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create issue report'
            // Removed detailed error message for security
        });
    }
});
/**
 * GET /api/chat/escalations
 * Get all chat escalations for staff dashboard - SECURED
 */
router.get('/escalations', dashboardLimiter, async (req, res) => {
    try {
        const { status, limit = 50 } = req.query;
        console.log(`📊 [CHAT-ESCALATIONS] Fetching escalations (status: ${status || 'all'})`);
        // Validate and sanitize query parameters
        const maxLimit = Math.min(parseInt(limit, 10) || 50, 100); // Cap at 100
        const allowedStatuses = ['pending', 'assigned', 'resolved', 'cancelled'];
        const validatedStatus = status && allowedStatuses.includes(status) ? status : null;
        // Build secure query
        let query = db.select().from(chatEscalations);
        if (validatedStatus) {
            query = query.where(eq(chatEscalations.status, validatedStatus));
        }
        const escalations = await query
            .orderBy(desc(chatEscalations.createdAt))
            .limit(maxLimit);
        res.json({
            success: true,
            escalations,
            total: escalations.length,
            filters: { status: validatedStatus, limit: maxLimit }
        });
    }
    catch (error) {
        console.error('❌ [CHAT-ESCALATIONS] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch chat escalations'
            // Removed detailed error message for security
        });
    }
});
/**
 * GET /api/chat/issue-reports
 * Get all issue reports for staff dashboard - SECURED
 */
router.get('/issue-reports', dashboardLimiter, async (req, res) => {
    try {
        const { status, severity, limit = 50 } = req.query;
        console.log(`📊 [CHAT-REPORTS] Fetching issue reports`);
        // Validate and sanitize query parameters
        const maxLimit = Math.min(parseInt(limit, 10) || 50, 100); // Cap at 100
        const allowedStatuses = ['open', 'in_progress', 'resolved', 'closed'];
        const allowedSeverities = ['low', 'medium', 'high', 'critical'];
        const validatedStatus = status && allowedStatuses.includes(status) ? status : null;
        const validatedSeverity = severity && allowedSeverities.includes(severity) ? severity : null;
        // Build secure query
        let query = db.select().from(chatIssueReports);
        const conditions = [];
        if (validatedStatus) {
            conditions.push(eq(chatIssueReports.status, validatedStatus));
        }
        if (validatedSeverity) {
            conditions.push(eq(chatIssueReports.severity, validatedSeverity));
        }
        if (conditions.length > 0) {
            query = query.where(and(...conditions));
        }
        const reports = await query
            .orderBy(desc(chatIssueReports.createdAt))
            .limit(maxLimit);
        console.log(`✅ [CHAT-REPORTS] Retrieved ${reports.length} issue reports`);
        res.json({
            success: true,
            reports,
            total: reports.length,
            filters: { status: validatedStatus, severity: validatedSeverity, limit: maxLimit }
        });
    }
    catch (error) {
        console.error('❌ [CHAT-REPORTS] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch issue reports'
            // Removed detailed error message for security
        });
    }
});
/**
 * PATCH /api/chat/escalations/:id/status
 * Update escalation status (assign, resolve, etc.) - SECURED
 */
router.patch('/escalations/:id/status', generalLimiter, async (req, res) => {
    try {
        const { id } = req.params;
        const { status, assignedStaffId, resolution } = req.body;
        console.log(`🔄 [CHAT-ESCALATION-UPDATE] Updating escalation ${id} to status: ${status}`);
        // Validate escalation ID (UUID format)
        if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid escalation ID'
            });
        }
        // Validate status
        const allowedStatuses = ['pending', 'assigned', 'resolved', 'cancelled'];
        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }
        // Validate resolution if provided
        let validatedResolution = null;
        if (resolution) {
            try {
                validatedResolution = sanitizeText(resolution, 1000);
            }
            catch (error) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid resolution format'
                });
            }
        }
        // Prepare update data with proper type handling
        const updateData = {
            status,
            updatedAt: new Date()
        };
        if (assignedStaffId !== undefined) {
            updateData.assignedStaffId = assignedStaffId || null;
        }
        if (validatedResolution !== null) {
            updateData.resolution = validatedResolution;
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
    }
    catch (error) {
        console.error('❌ [CHAT-ESCALATION-UPDATE] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update escalation status'
            // Removed detailed error message for security
        });
    }
});
/**
 * GET /api/chat/handoff-queue
 * Get handoff queue for chat management - SECURED
 */
router.get('/handoff-queue', dashboardLimiter, async (req, res) => {
    try {
        console.log('🔄 [HANDOFF-QUEUE] Fetching handoff queue...');
        // Return escalations as handoff queue with proper security
        const escalations = await db.select()
            .from(chatEscalations)
            .where(eq(chatEscalations.status, 'pending'))
            .orderBy(desc(chatEscalations.createdAt))
            .limit(50);
        console.log(`✅ [HANDOFF-QUEUE] Retrieved ${escalations.length} pending escalations`);
        // Format response with sanitized data
        const formattedQueue = escalations.map(escalation => ({
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
        }));
        res.json(formattedQueue);
    }
    catch (error) {
        console.error('❌ [HANDOFF-QUEUE] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch handoff queue'
            // Removed detailed error message for security
        });
    }
});
/**
 * POST /api/chat/request-staff
 * Handle staff assistance requests from client - SECURED
 */
router.post('/request-staff', escalationLimiter, async (req, res) => {
    try {
        const { sessionId, userName, userEmail, message, requestType } = req.body;
        console.log(`🆘 [CHAT-REQUEST-STAFF] New staff request: ${sessionId}`);
        // Validate and sanitize inputs
        let validatedSessionId;
        let validatedUserName;
        let validatedUserEmail;
        let validatedMessage;
        let validatedRequestType;
        try {
            validatedSessionId = sessionId ? validateSessionId(sessionId) : `session_${Date.now()}`;
            validatedUserName = userName ? validateName(userName) : 'Anonymous User';
            validatedUserEmail = userEmail ? validateEmail(userEmail) : null;
            validatedMessage = message ? sanitizeText(message, 1000) : 'User requested staff assistance';
            validatedRequestType = validateEscalationReason(requestType);
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Invalid input'
            });
        }
        // Insert escalation record using secure schema
        const escalationData = insertChatEscalationSchema.parse({
            sessionId: validatedSessionId,
            userName: validatedUserName,
            userEmail: validatedUserEmail,
            message: validatedMessage,
            escalationReason: validatedRequestType,
            applicationId: null,
            status: 'pending'
        });
        const [escalationRecord] = await db.insert(chatEscalations)
            .values(escalationData)
            .returning();
        // Emit real-time notification to staff (sanitized data)
        const io = getGlobalIo();
        if (io) {
            io.to('staff-chat-management').emit('staff-request', {
                id: escalationRecord.id,
                sessionId: validatedSessionId,
                userName: validatedUserName,
                userEmail: validatedUserEmail,
                requestType: validatedRequestType,
                status: 'pending',
                createdAt: escalationRecord.createdAt
            });
        }
        res.json({
            success: true,
            escalationId: escalationRecord.id,
            message: 'Staff assistance request received'
        });
    }
    catch (error) {
        console.error('Error handling staff request:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process staff request'
        });
    }
});
/**
 * POST /api/chat/log-contact
 * Log contact interactions from client chat - SECURED
 */
router.post('/log-contact', generalLimiter, async (req, res) => {
    try {
        const { sessionId, userName, userEmail, action, details } = req.body;
        // Validate and sanitize inputs
        let validatedSessionId = null;
        let validatedUserName;
        let validatedUserEmail = null;
        let validatedAction;
        let validatedDetails;
        try {
            if (sessionId)
                validatedSessionId = validateSessionId(sessionId);
            validatedUserName = userName ? validateName(userName) : 'Anonymous User';
            if (userEmail)
                validatedUserEmail = validateEmail(userEmail);
            validatedAction = action ? sanitizeText(action, 100) : 'unknown';
            validatedDetails = details ? sanitizeText(details, 500) : '';
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Invalid input'
            });
        }
        console.log(`📝 [CHAT-LOG-CONTACT] Logging contact: ${validatedAction} for ${validatedUserName}`);
        // Log the contact interaction securely (without sensitive data in logs)
        console.log(`Contact logged: action=${validatedAction}, session=${validatedSessionId || 'none'}`);
        res.json({
            success: true,
            message: 'Contact interaction logged'
        });
    }
    catch (error) {
        console.error('Error logging contact:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to log contact interaction'
        });
    }
});
/**
 * POST /api/chat/user-message
 * Handle user messages from client chat - SECURED
 */
router.post('/user-message', chatMessageLimiter, async (req, res) => {
    try {
        const { sessionId, userName, userEmail, message, messageType } = req.body;
        // Validate and sanitize inputs
        let validatedSessionId = null;
        let validatedUserName;
        let validatedUserEmail = null;
        let validatedMessage;
        try {
            if (sessionId)
                validatedSessionId = validateSessionId(sessionId);
            validatedUserName = userName ? validateName(userName) : 'Anonymous User';
            if (userEmail)
                validatedUserEmail = validateEmail(userEmail);
            validatedMessage = message ? validateMessage(message) : '';
        }
        catch (error) {
            return res.status(400).json({
                success: false,
                error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Invalid input'
            });
        }
        console.log(`💬 [CHAT-USER-MESSAGE] New message from ${validatedUserName}: ${validatedMessage.substring(0, 50)}...`);
        // Emit message to staff for real-time chat monitoring (sanitized data)
        const io = getGlobalIo();
        if (io) {
            io.to('staff-chat-management').emit('user-message', {
                sessionId: validatedSessionId,
                userName: validatedUserName,
                userEmail: validatedUserEmail,
                message: validatedMessage,
                messageType: messageType === 'text' ? 'text' : 'unknown',
                timestamp: new Date().toISOString()
            });
        }
        res.json({
            success: true,
            message: 'User message received',
            sessionId: validatedSessionId
        });
    }
    catch (error) {
        console.error('Error handling user message:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process user message'
        });
    }
});
export default router;
