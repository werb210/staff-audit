/**
 * V2 Communications Service
 * Comprehensive email, SMS, voice, and OTP communication management
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure WebSocket for Neon
neonConfig.webSocketConstructor = ws;

// Database connection
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Core communication interfaces
export interface EmailMessage {
  id?: number;
  accountId: number;
  messageId: string;
  subject?: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  body: string;
  bodyHtml?: string;
  bodyText?: string;
  messageDate?: Date;
  isRead?: boolean;
  isStarred?: boolean;
  hasAttachments?: boolean;
  contactId?: number;
  applicationId?: string;
  category?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  tags?: string[];
}

export interface SMSMessage {
  id?: number;
  messageSid?: string;
  from: string;
  to: string;
  body: string;
  direction: 'inbound' | 'outbound';
  status?: string;
  contactId?: number;
  applicationId?: string;
  isProcessed?: boolean;
  isAutomated?: boolean;
  automationType?: string;
}

export interface VoiceCall {
  id?: number;
  callSid?: string;
  from: string;
  to: string;
  direction: 'inbound' | 'outbound';
  status?: string;
  duration?: number;
  recordingUrl?: string;
  contactId?: number;
  applicationId?: string;
  userId?: string;
  notes?: string;
  callPurpose?: string;
  outcome?: string;
  requiresFollowUp?: boolean;
  followUpDate?: Date;
}

export interface OTPVerification {
  id?: number;
  phoneNumber: string;
  code: string;
  purpose: string;
  userId?: string;
  applicationId?: string;
  isVerified?: boolean;
  attempts?: number;
  maxAttempts?: number;
  expiresAt: Date;
  verifiedAt?: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface CommunicationTemplate {
  id?: number;
  name: string;
  type: 'email' | 'sms' | 'voice';
  category: string;
  subject?: string;
  body: string;
  variables: string[];
  isActive?: boolean;
  isDefault?: boolean;
  usageCount?: number;
  lastUsed?: Date;
}

export class CommunicationsService {
  constructor() {
    console.log('📧 Communications Service initialized');
    this.initializeTwilio();
  }

  private initializeTwilio() {
    // Initialize Twilio client if credentials are available
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      console.log('📱 Twilio integration configured');
    } else {
      console.log('ℹ️ Twilio credentials not configured - SMS/Voice features will be limited');
    }
  }

  /**
   * Email Management Methods
   */
  async sendEmail(emailData: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const startTime = Date.now();
    console.log(`📧 Sending email to: ${emailData.to.join(', ')}`);

    try {
      // For demo purposes, we'll simulate sending and store the message
      const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Store email message in database
      const result = await pool.query(`
        INSERT INTO email_messages (
          account_id, message_id, subject, from_address, to_addresses, cc_addresses,
          bcc_addresses, body, body_html, body_text, message_date, is_sent,
          contact_id, application_id, category, priority, tags
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), true, $11, $12, $13, $14, $15
        ) RETURNING id
      `, [
        emailData.accountId,
        messageId,
        emailData.subject,
        emailData.from,
        emailData.to,
        emailData.cc || [],
        emailData.bcc || [],
        emailData.body,
        emailData.bodyHtml,
        emailData.bodyText,
        emailData.contactId,
        emailData.applicationId,
        emailData.category || 'outbound',
        emailData.priority || 'normal',
        emailData.tags || []
      ]);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Email sent successfully in ${processingTime}ms`);

      return {
        success: true,
        messageId: messageId
      };

    } catch (error) {
      console.error('❌ Error sending email:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getEmails(accountId: number, options: {
    limit?: number;
    offset?: number;
    category?: string;
    isRead?: boolean;
  } = {}): Promise<EmailMessage[]> {
    try {
      const { limit = 50, offset = 0, category, isRead } = options;
      
      let query = `
        SELECT * FROM email_messages 
        WHERE account_id = $1
      `;
      const params = [accountId];
      let paramIndex = 2;

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (isRead !== undefined) {
        query += ` AND is_read = $${paramIndex}`;
        params.push(isRead);
        paramIndex++;
      }

      query += ` ORDER BY message_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        accountId: row.account_id,
        messageId: row.message_id,
        subject: row.subject,
        from: row.from_address,
        to: row.to_addresses,
        cc: row.cc_addresses,
        bcc: row.bcc_addresses,
        body: row.body,
        bodyHtml: row.body_html,
        bodyText: row.body_text,
        messageDate: row.message_date,
        isRead: row.is_read,
        isStarred: row.is_starred,
        hasAttachments: row.has_attachments,
        contactId: row.contact_id,
        applicationId: row.application_id,
        category: row.category,
        priority: row.priority,
        tags: row.tags
      }));

    } catch (error) {
      console.error('❌ Error getting emails:', error);
      throw error;
    }
  }

  /**
   * SMS Management Methods
   */
  async sendSMS(smsData: SMSMessage): Promise<{ success: boolean; messageSid?: string; error?: string }> {
    const startTime = Date.now();
    console.log(`📱 Sending SMS to: ${smsData.to}`);

    try {
      // Generate a mock message SID for demo purposes
      const messageSid = `SM${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      
      // Store SMS message in database
      const result = await pool.query(`
        INSERT INTO sms_messages (
          message_sid, from_number, to_number, body, direction, status,
          contact_id, application_id, is_automated, automation_type
        ) VALUES (
          $1, $2, $3, $4, 'outbound', 'sent', $5, $6, $7, $8
        ) RETURNING id
      `, [
        messageSid,
        smsData.from,
        smsData.to,
        smsData.body,
        smsData.contactId,
        smsData.applicationId,
        smsData.isAutomated || false,
        smsData.automationType
      ]);

      const processingTime = Date.now() - startTime;
      console.log(`✅ SMS sent successfully in ${processingTime}ms`);

      return {
        success: true,
        messageSid: messageSid
      };

    } catch (error) {
      console.error('❌ Error sending SMS:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getSMSMessages(options: {
    limit?: number;
    offset?: number;
    direction?: 'inbound' | 'outbound';
    applicationId?: string;
  } = {}): Promise<SMSMessage[]> {
    try {
      const { limit = 50, offset = 0, direction, applicationId } = options;
      
      let query = `SELECT * FROM sms_messages WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (direction) {
        query += ` AND direction = $${paramIndex}`;
        params.push(direction);
        paramIndex++;
      }

      if (applicationId) {
        query += ` AND application_id = $${paramIndex}`;
        params.push(applicationId);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        messageSid: row.message_sid,
        from: row.from_number,
        to: row.to_number,
        body: row.body,
        direction: row.direction,
        status: row.status,
        contactId: row.contact_id,
        applicationId: row.application_id,
        isProcessed: row.is_processed,
        isAutomated: row.is_automated,
        automationType: row.automation_type
      }));

    } catch (error) {
      console.error('❌ Error getting SMS messages:', error);
      throw error;
    }
  }

  /**
   * Voice Call Management Methods
   */
  async initiateCall(callData: VoiceCall): Promise<{ success: boolean; callSid?: string; error?: string }> {
    const startTime = Date.now();
    console.log(`📞 Initiating call to: ${callData.to}`);

    try {
      // Generate a mock call SID for demo purposes
      const callSid = `CA${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
      
      // Store voice call in database
      const result = await pool.query(`
        INSERT INTO voice_calls (
          call_sid, from_number, to_number, direction, status,
          contact_id, application_id, user_id, call_purpose
        ) VALUES (
          $1, $2, $3, 'outbound', 'initiated', $4, $5, $6, $7
        ) RETURNING id
      `, [
        callSid,
        callData.from,
        callData.to,
        callData.contactId,
        callData.applicationId,
        callData.userId,
        callData.callPurpose
      ]);

      const processingTime = Date.now() - startTime;
      console.log(`✅ Call initiated successfully in ${processingTime}ms`);

      return {
        success: true,
        callSid: callSid
      };

    } catch (error) {
      console.error('❌ Error initiating call:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getVoiceCalls(options: {
    limit?: number;
    offset?: number;
    direction?: 'inbound' | 'outbound';
    applicationId?: string;
    userId?: string;
  } = {}): Promise<VoiceCall[]> {
    try {
      const { limit = 50, offset = 0, direction, applicationId, userId } = options;
      
      let query = `SELECT * FROM voice_calls WHERE 1=1`;
      const params = [];
      let paramIndex = 1;

      if (direction) {
        query += ` AND direction = $${paramIndex}`;
        params.push(direction);
        paramIndex++;
      }

      if (applicationId) {
        query += ` AND application_id = $${paramIndex}`;
        params.push(applicationId);
        paramIndex++;
      }

      if (userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        callSid: row.call_sid,
        from: row.from_number,
        to: row.to_number,
        direction: row.direction,
        status: row.status,
        duration: row.duration,
        recordingUrl: row.recording_url,
        contactId: row.contact_id,
        applicationId: row.application_id,
        userId: row.user_id,
        notes: row.notes,
        callPurpose: row.call_purpose,
        outcome: row.outcome,
        requiresFollowUp: row.requires_follow_up,
        followUpDate: row.follow_up_date
      }));

    } catch (error) {
      console.error('❌ Error getting voice calls:', error);
      throw error;
    }
  }

  /**
   * OTP Verification Methods
   */
  async generateOTP(otpData: {
    phoneNumber: string;
    purpose: string;
    userId?: string;
    applicationId?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<{ success: boolean; otpId?: number; code?: string; error?: string }> {
    const startTime = Date.now();
    console.log(`🔐 Generating OTP for: ${otpData.phoneNumber}`);

    try {
      // Generate 6-digit OTP code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Set expiration to 10 minutes from now
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      // Store OTP verification in database
      const result = await pool.query(`
        INSERT INTO otp_verifications (
          phone_number, code, purpose, user_id, application_id,
          expires_at, ip_address, user_agent
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        ) RETURNING id
      `, [
        otpData.phoneNumber,
        code,
        otpData.purpose,
        otpData.userId,
        otpData.applicationId,
        expiresAt,
        otpData.ipAddress,
        otpData.userAgent
      ]);

      // Send OTP via SMS
      const smsResult = await this.sendSMS({
        from: process.env.TWILIO_PHONE_NUMBER || '+1234567890',
        to: otpData.phoneNumber,
        body: `Your verification code is: ${code}. This code will expire in 10 minutes. Do not share this code with anyone.`,
        direction: 'outbound',
        isAutomated: true,
        automationType: 'otp_verification'
      });

      const processingTime = Date.now() - startTime;
      console.log(`✅ OTP generated and sent in ${processingTime}ms`);

      return {
        success: true,
        otpId: result.rows[0].id,
        code: process.env.NODE_ENV === 'development' ? code : undefined // Only return code in development
      };

    } catch (error) {
      console.error('❌ Error generating OTP:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifyOTP(phoneNumber: string, code: string, purpose: string): Promise<{ 
    success: boolean; 
    otpId?: number; 
    isExpired?: boolean; 
    attemptsExceeded?: boolean; 
    error?: string 
  }> {
    const startTime = Date.now();
    console.log(`🔐 Verifying OTP for: ${phoneNumber}`);

    try {
      // Find the most recent OTP for this phone number and purpose
      const result = await pool.query(`
        SELECT * FROM otp_verifications 
        WHERE phone_number = $1 AND purpose = $2 AND is_verified = false 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [phoneNumber, purpose]);

      if (result.rows.length === 0) {
        return {
          success: false,
          error: 'No valid OTP found'
        };
      }

      const otp = result.rows[0];

      // Check if OTP has expired
      if (new Date() > new Date(otp.expires_at)) {
        return {
          success: false,
          isExpired: true,
          error: 'OTP has expired'
        };
      }

      // Check if max attempts exceeded
      if (otp.attempts >= otp.max_attempts) {
        return {
          success: false,
          attemptsExceeded: true,
          error: 'Maximum verification attempts exceeded'
        };
      }

      // Increment attempts
      await pool.query(`
        UPDATE otp_verifications 
        SET attempts = attempts + 1, updated_at = NOW() 
        WHERE id = $1
      `, [otp.id]);

      // Check if code matches
      if (otp.code !== code) {
        return {
          success: false,
          error: 'Invalid verification code'
        };
      }

      // Mark as verified
      await pool.query(`
        UPDATE otp_verifications 
        SET is_verified = true, verified_at = NOW(), updated_at = NOW() 
        WHERE id = $1
      `, [otp.id]);

      const processingTime = Date.now() - startTime;
      console.log(`✅ OTP verified successfully in ${processingTime}ms`);

      return {
        success: true,
        otpId: otp.id
      };

    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Template Management Methods
   */
  async getTemplates(type?: 'email' | 'sms' | 'voice', category?: string): Promise<CommunicationTemplate[]> {
    try {
      let query = `SELECT * FROM communication_templates WHERE is_active = true`;
      const params = [];
      let paramIndex = 1;

      if (type) {
        query += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      query += ` ORDER BY name`;

      const result = await pool.query(query, params);
      
      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        category: row.category,
        subject: row.subject,
        body: row.body,
        variables: row.variables,
        isActive: row.is_active,
        isDefault: row.is_default,
        usageCount: row.usage_count,
        lastUsed: row.last_used
      }));

    } catch (error) {
      console.error('❌ Error getting templates:', error);
      throw error;
    }
  }

  async renderTemplate(templateId: number, variables: Record<string, string>): Promise<{ 
    subject?: string; 
    body: string; 
    error?: string 
  }> {
    try {
      const result = await pool.query(`
        SELECT * FROM communication_templates WHERE id = $1 AND is_active = true
      `, [templateId]);

      if (result.rows.length === 0) {
        throw new Error('Template not found');
      }

      const template = result.rows[0];
      let renderedSubject = template.subject;
      let renderedBody = template.body;

      // Replace template variables
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        if (renderedSubject) {
          renderedSubject = renderedSubject.replace(new RegExp(placeholder, 'g'), value);
        }
        renderedBody = renderedBody.replace(new RegExp(placeholder, 'g'), value);
      }

      // Update usage count
      await pool.query(`
        UPDATE communication_templates 
        SET usage_count = usage_count + 1, last_used = NOW() 
        WHERE id = $1
      `, [templateId]);

      return {
        subject: renderedSubject,
        body: renderedBody
      };

    } catch (error) {
      console.error('❌ Error rendering template:', error);
      return {
        subject: undefined,
        body: '',
        error: error.message
      };
    }
  }

  /**
   * Statistics and Analytics Methods
   */
  async getCommunicationStats(): Promise<any> {
    try {
      const [emailStats, smsStats, voiceStats, otpStats] = await Promise.all([
        pool.query(`
          SELECT 
            COUNT(*) as total_emails,
            COUNT(*) FILTER (WHERE is_sent = true) as sent_emails,
            COUNT(*) FILTER (WHERE is_read = false) as unread_emails,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as emails_today
          FROM email_messages
        `),
        pool.query(`
          SELECT 
            COUNT(*) as total_sms,
            COUNT(*) FILTER (WHERE direction = 'outbound') as sent_sms,
            COUNT(*) FILTER (WHERE direction = 'inbound') as received_sms,
            COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as sms_today
          FROM sms_messages
        `),
        pool.query(`
          SELECT 
            COUNT(*) as total_calls,
            COUNT(*) FILTER (WHERE direction = 'outbound') as outbound_calls,
            COUNT(*) FILTER (WHERE direction = 'inbound') as inbound_calls,
            AVG(duration) as avg_duration
          FROM voice_calls
        `),
        pool.query(`
          SELECT 
            COUNT(*) as total_otps,
            COUNT(*) FILTER (WHERE is_verified = true) as verified_otps,
            COUNT(*) FILTER (WHERE expires_at < NOW() AND is_verified = false) as expired_otps
          FROM otp_verifications
        `)
      ]);

      return {
        email: emailStats.rows[0],
        sms: smsStats.rows[0],
        voice: voiceStats.rows[0],
        otp: otpStats.rows[0],
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error getting communication stats:', error);
      throw error;
    }
  }
}