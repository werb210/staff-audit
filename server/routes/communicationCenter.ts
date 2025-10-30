/**
 * 📞 COMMUNICATION CENTER API ROUTES
 * 
 * Complete Twilio Communication Center backend
 * Features: SMS, Voice Calls, Templates, Real-time updates
 * 
 * Created: July 25, 2025
 */

import { Router } from 'express';
import { TwilioService } from '../utils/twilioService.js';
import { getGlobalIo } from '../websocket.js';

const router = Router();

// Mount sub-routes
import communicationCallsRouter from './communicationCalls.js';
import communicationEmailRouter from './communicationEmail.js';

router.use('/calls', communicationCallsRouter);
router.use('/email', communicationEmailRouter);

// SMS Routes
// GET /sms - List SMS threads
router.get('/sms', async (req: any, res: any) => {
  try {
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');
    
    // Get SMS threads grouped by phone number
    const threads = await db.execute(sql`
      SELECT 
        phone_number,
        MAX(id) as thread_id,
        COUNT(*) as message_count,
        MAX(createdAt) as last_message_time,
        (SELECT body FROM sms_messages s2 WHERE s2.phone_number = s1.phone_number ORDER BY createdAt DESC LIMIT 1) as last_message,
        (SELECT direction FROM sms_messages s2 WHERE s2.phone_number = s1.phone_number ORDER BY createdAt DESC LIMIT 1) as direction,
        COUNT(CASE WHEN direction = 'incoming' AND status != 'read' THEN 1 END) as unread_count
      FROM sms_messages s1
      GROUP BY phone_number
      ORDER BY last_message_time DESC
    `);

    const threadsData = threads.rows.map((thread: any) => ({
      id: thread.thread_id,
      contact_name: `Contact ${thread.phone_number}`,
      phone_number: thread.phone_number,
      last_message: thread.last_message || '',
      last_message_time: thread.last_message_time,
      unread_count: parseInt(thread.unread_count) || 0,
      direction: thread.direction || 'outgoing'
    }));

    res.json({
      success: true,
      threads: threadsData,
      count: threadsData.length
    });

  } catch (error: any) {
    console.error('❌ [COMM CENTER] Failed to fetch SMS threads:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS threads'
    });
  }
});

// GET /sms/:threadId - Get messages for a specific thread
router.get('/sms/:threadId', async (req: any, res: any) => {
  try {
    const { threadId } = req.params;
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');
    
    // Get all messages for the thread (by phone number)
    const threadInfo = await db.execute(sql`
      SELECT phone_number FROM sms_messages WHERE id = ${threadId} LIMIT 1
    `);

    if (!threadInfo.rows.length) {
      return res.status(404).json({
        success: false,
        error: 'Thread not found'
      });
    }

    const phoneNumber = threadInfo.rows[0].phone_number;
    
    const messages = await db.execute(sql`
      SELECT *
      FROM sms_messages
      WHERE phone_number = ${phoneNumber}
      ORDER BY createdAt ASC
    `);

    res.json({
      success: true,
      messages: messages.rows,
      count: messages.rows.length
    });

  } catch (error: any) {
    console.error('❌ [COMM CENTER] Failed to fetch SMS messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch SMS messages'
    });
  }
});

router.post('/sms/send', async (req: any, res: any) => {
  try {
    const { to, message, contactId } = req.body;
    
    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Phone number and message are required'
      });
    }

    // Send SMS via Twilio
    const result = await TwilioService.Messaging.sendSMS(to, message);
    
    if (result.success) {
      // Store in database
      const { db } = await import('../db');
      const { sql } = await import('drizzle-orm');
      
      const smsRecord = await db.execute(sql`
        INSERT INTO sms_messages (contact_id, direction, body, status, twilio_sid, phone_number, to_number, from_number)
        VALUES (${contactId || null}, 'outgoing', ${message}, ${result.status}, ${result.sid}, ${to}, ${to}, ${result.from})
        RETURNING *
      `);

      // Emit real-time SMS event to all connected clients
      const io = getGlobalIo();
      if (io && smsRecord.rows[0]) {
        const smsData = {
          id: smsRecord.rows[0].id,
          contact_id: smsRecord.rows[0].contact_id,
          direction: 'outgoing',
          body: message,
          status: result.status,
          twilio_sid: result.sid,
          phone_number: to,
          from_number: result.from,
          to_number: to,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        io.emit('sms:new', smsData);
        console.log(`📡 [COMM CENTER] Real-time SMS event emitted: ${result.sid}`);
      }

      console.log(`📱 [COMM CENTER] SMS sent successfully: ${result.sid}`);
      
      res.json({
        success: true,
        sid: result.sid,
        status: result.status,
        message: 'SMS sent successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        code: result.code
      });
    }

  } catch (error: any) {
    console.error('❌ [COMM CENTER] SMS send failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get SMS Messages
router.get('/sms/messages', async (req: any, res: any) => {
  try {
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const messages = await db.execute(sql`
      SELECT 
        id,
        contact_id,
        direction,
        body,
        status,
        twilio_sid,
        phone_number,
        from_number,
        to_number,
        createdAt,
        updatedAt
      FROM sms_messages 
      ORDER BY createdAt DESC 
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM sms_messages
    `);

    res.json({
      success: true,
      messages: messages.rows,
      pagination: {
        page,
        limit,
        total: totalCount.rows[0]?.count || 0,
        pages: Math.ceil((Number(totalCount.rows[0]?.count) || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ [COMM CENTER] Failed to fetch SMS messages:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Voice Call Routes
// GET /calls - List call history  
router.get('/calls', async (req: any, res: any) => {
  try {
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const calls = await db.execute(sql`
      SELECT 
        id,
        contact_id,
        direction,
        duration_seconds,
        twilio_sid,
        recording_url,
        transcription,
        phone_number,
        from_number,
        to_number,
        status,
        createdAt,
        updatedAt
      FROM call_logs 
      ORDER BY createdAt DESC 
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM call_logs
    `);

    res.json({
      success: true,
      calls: calls.rows,
      pagination: {
        page,
        limit,
        total: totalCount.rows[0]?.count || 0,
        pages: Math.ceil((Number(totalCount.rows[0]?.count) || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ [COMM CENTER] Failed to fetch call logs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

router.post('/voice/call', async (req: any, res: any) => {
  try {
    const { to, twimlUrl, contactId } = req.body;
    
    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Phone number is required'
      });
    }

    // Use direct TwiML instead of URL for localhost development
    const defaultTwiML = `
      <Response>
        <Say voice="alice">Hello, this is a call from Boreal Financial. Please hold while we connect you with a representative.</Say>
        <Pause length="2"/>
        <Say voice="alice">Thank you for your call. We will be in touch soon. Goodbye.</Say>
      </Response>
    `;

    const result = await TwilioService.Voice.makeCallWithTwiML(to, defaultTwiML);
    
    if (result.success) {
      // Store in database
      const { db } = await import('../db');
      const { sql } = await import('drizzle-orm');
      
      const callRecord = await db.execute(sql`
        INSERT INTO call_logs (contact_id, direction, twilio_sid, phone_number, to_number, status)
        VALUES (${contactId || null}, 'outgoing', ${result.sid}, ${to}, ${to}, ${result.status})
        RETURNING *
      `);

      // Emit real-time call event to all connected clients
      const io = getGlobalIo();
      if (io && callRecord.rows[0]) {
        const callData = {
          id: callRecord.rows[0].id,
          contact_id: callRecord.rows[0].contact_id,
          direction: 'outgoing',
          twilio_sid: result.sid,
          phone_number: to,
          to_number: to,
          status: result.status,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        io.emit('call:new', callData);
        console.log(`📡 [COMM CENTER] Real-time call event emitted: ${result.sid}`);
      }

      console.log(`📞 [COMM CENTER] Call initiated successfully: ${result.sid}`);
      
      res.json({
        success: true,
        sid: result.sid,
        status: result.status,
        message: 'Call initiated successfully'
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        code: result.code
      });
    }

  } catch (error: any) {
    console.error('❌ [COMM CENTER] Call initiation failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get Call Logs
router.get('/voice/calls', async (req: any, res: any) => {
  try {
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const calls = await db.execute(sql`
      SELECT 
        id,
        contact_id,
        direction,
        duration_seconds,
        twilio_sid,
        recording_url,
        transcription,
        phone_number,
        from_number,
        to_number,
        status,
        createdAt,
        updatedAt
      FROM call_logs 
      ORDER BY createdAt DESC 
      LIMIT ${limit} OFFSET ${offset}
    `);

    const totalCount = await db.execute(sql`
      SELECT COUNT(*) as count FROM call_logs
    `);

    res.json({
      success: true,
      calls: calls.rows,
      pagination: {
        page,
        limit,
        total: totalCount.rows[0]?.count || 0,
        pages: Math.ceil((Number(totalCount.rows[0]?.count) || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('❌ [COMM CENTER] Failed to fetch call logs:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// TwiML Routes
router.post('/voice/twiml/voicemail', (req: any, res: any) => {
  const twiml = `
    <Response>
      <Say voice="alice">Thank you for calling Boreal Financial. Please leave a message after the tone.</Say>
      <Record transcribe="true" transcribeCallback="/api/communication/voice/transcribe" maxLength="300" />
      <Say voice="alice">Thank you for your message. We will get back to you soon.</Say>
    </Response>
  `;
  
  res.type('text/xml').send(twiml);
});

router.post('/voice/transcribe', async (req: any, res: any) => {
  try {
    const { CallSid, TranscriptionText, RecordingUrl } = req.body;
    
    if (CallSid && (TranscriptionText || RecordingUrl)) {
      const { db } = await import('../db');
      const { sql } = await import('drizzle-orm');
      
      await db.execute(sql`
        UPDATE call_logs 
        SET transcription = ${TranscriptionText || null}, 
            recording_url = ${RecordingUrl || null},
            updatedAt = NOW()
        WHERE twilio_sid = ${CallSid}
      `);

      console.log(`🎙️ [COMM CENTER] Call transcription saved for ${CallSid}`);
    }
    
    res.sendStatus(200);
  } catch (error: any) {
    console.error('❌ [COMM CENTER] Transcription save failed:', error);
    res.sendStatus(500);
  }
});

// Webhook Routes
router.post('/webhooks/inbound-sms', async (req: any, res: any) => {
  try {
    const { From, Body, MessageSid } = req.body;
    
    // Store inbound SMS
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');
    
    const incomingSMS = await db.execute(sql`
      INSERT INTO sms_messages (direction, body, twilio_sid, phone_number, from_number, status)
      VALUES ('incoming', ${Body}, ${MessageSid}, ${From}, ${From}, 'received')
      RETURNING *
    `);

    // Emit real-time inbound SMS event
    const io = getGlobalIo();
    if (io && incomingSMS.rows[0]) {
      const smsData = {
        id: incomingSMS.rows[0].id,
        contact_id: null,
        direction: 'incoming',
        body: Body,
        status: 'received',
        twilio_sid: MessageSid,
        phone_number: From,
        from_number: From,
        to_number: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      io.emit('sms:new', smsData);
      console.log(`📡 [COMM CENTER] Real-time inbound SMS event emitted: ${MessageSid}`);
    }

    console.log(`📱 [COMM CENTER] Inbound SMS received from ${From}: ${Body}`);
    
    // Auto-reply TwiML (optional)
    res.type('text/xml').send('<Response></Response>');
    
  } catch (error: any) {
    console.error('❌ [COMM CENTER] Inbound SMS processing failed:', error);
    res.type('text/xml').send('<Response></Response>');
  }
});

router.post('/webhooks/inbound-call', async (req: any, res: any) => {
  try {
    const { From, CallSid } = req.body;
    
    // Store inbound call
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');
    
    const incomingCall = await db.execute(sql`
      INSERT INTO call_logs (direction, twilio_sid, phone_number, from_number, status)
      VALUES ('incoming', ${CallSid}, ${From}, ${From}, 'initiated')
      RETURNING *
    `);

    // Emit real-time inbound call event
    const io = getGlobalIo();
    if (io && incomingCall.rows[0]) {
      const callData = {
        id: incomingCall.rows[0].id,
        contact_id: null,
        direction: 'incoming',
        twilio_sid: CallSid,
        phone_number: From,
        from_number: From,
        status: 'initiated',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      io.emit('call:new', callData);
      console.log(`📡 [COMM CENTER] Real-time inbound call event emitted: ${CallSid}`);
    }

    console.log(`📞 [COMM CENTER] Inbound call received from ${From}`);
    
    // TwiML for incoming call handling
    const twiml = `
      <Response>
        <Say voice="alice">Thank you for calling Boreal Financial. Please hold while we connect you, or leave a message after the tone.</Say>
        <Dial timeout="30">
          <Number>+15878881837</Number>
        </Dial>
        <Record transcribe="true" transcribeCallback="/api/communication/voice/transcribe" maxLength="300" />
      </Response>
    `;
    
    res.type('text/xml').send(twiml);
    
  } catch (error: any) {
    console.error('❌ [COMM CENTER] Inbound call processing failed:', error);
    res.type('text/xml').send('<Response></Response>');
  }
});

// Status Update Webhooks
router.post('/webhooks/sms-status', async (req: any, res: any) => {
  try {
    const { MessageSid, MessageStatus } = req.body;
    
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');
    
    await db.execute(sql`
      UPDATE sms_messages 
      SET status = ${MessageStatus}, updatedAt = NOW()
      WHERE twilio_sid = ${MessageSid}
    `);

    console.log(`📱 [COMM CENTER] SMS status updated: ${MessageSid} -> ${MessageStatus}`);
    res.sendStatus(200);
    
  } catch (error: any) {
    console.error('❌ [COMM CENTER] SMS status update failed:', error);
    res.sendStatus(500);
  }
});

router.post('/webhooks/call-events', async (req: any, res: any) => {
  try {
    const { CallSid, CallStatus, CallDuration } = req.body;
    
    const { db } = await import('../db');
    const { sql } = await import('drizzle-orm');
    
    await db.execute(sql`
      UPDATE call_logs 
      SET status = ${CallStatus}, 
          duration_seconds = ${CallDuration || null}, 
          updatedAt = NOW()
      WHERE twilio_sid = ${CallSid}
    `);

    console.log(`📞 [COMM CENTER] Call status updated: ${CallSid} -> ${CallStatus}`);
    res.sendStatus(200);
    
  } catch (error: any) {
    console.error('❌ [COMM CENTER] Call status update failed:', error);
    res.sendStatus(500);
  }
});

// Communication Templates
router.get('/templates', async (req: any, res: any) => {
  try {
    const templates = [
      {
        id: '1',
        name: 'Application Update',
        category: 'updates',
        type: 'sms',
        body: 'Hi {{contactName}}, your application {{applicationId}} has been updated to {{status}}. {{additionalInfo}}'
      },
      {
        id: '2',
        name: 'Document Request',
        category: 'documents',
        type: 'sms',
        body: 'Hi {{contactName}}, we need additional documents for your application. Please upload: {{documentList}}'
      },
      {
        id: '3',
        name: 'Appointment Reminder',
        category: 'appointments',
        type: 'sms',
        body: 'Reminder: You have an appointment scheduled for {{appointmentDate}} at {{appointmentTime}}. {{locationInfo}}'
      },
      {
        id: '4',
        name: 'Follow-up Call',
        category: 'followup',
        type: 'voice',
        body: 'Thank you for your interest in Boreal Financial. We are following up on your recent inquiry.'
      }
    ];

    res.json({
      success: true,
      templates
    });

  } catch (error: any) {
    console.error('❌ [COMM CENTER] Failed to fetch templates:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Health Check
router.get('/health', async (req: any, res: any) => {
  try {
    const health = await TwilioService.healthCheck();
    
    res.json({
      success: true,
      service: 'Communication Center',
      twilio: health,
      database: 'connected',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

export default router;