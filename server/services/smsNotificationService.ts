/**
 * SMS Notification Service
 * Handles trigger-based SMS notifications for pipeline stage transitions
 */

import { db } from '../db';
import { sql } from 'drizzle-orm';

interface SMSNotificationData {
  applicationId: string;
  trigger: 'new_application' | 'in_review' | 'document_rejected' | 'all_documents_accepted' | 'sent_to_lender';
  firstName?: string;
  businessLegalName?: string;
  documentName?: string;
  documentCategory?: string;
}

interface SMSLogEntry {
  applicationId: string;
  phoneNumber: string;
  message: string;
  trigger: string;
  status: 'sent' | 'failed' | 'delivered' | 'undelivered';
  twilioSid?: string;
  errorMessage?: string;
}

/**
 * Send SMS notification and log to database
 */
export async function sendSMSNotification(data: SMSNotificationData): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    console.log(`📱 [SMS-NOTIFICATION] Processing trigger: ${data.trigger} for application: ${data.applicationId}`);
    
    // Get application data and phone number
    const applicationResult = await db.execute(sql`
      SELECT form_data, stage 
      FROM applications 
      WHERE id = ${data.applicationId}
      LIMIT 1
    `);
    
    if (!applicationResult.rows.length) {
      console.error(`❌ [SMS-NOTIFICATION] Application not found: ${data.applicationId}`);
      return { success: false, error: 'Application not found' };
    }
    
    const application = applicationResult.rows[0] as any;
    const formData = application.form_data;
    
    // Extract phone number from Step 4 data
    const phoneNumber = formData?.step4?.phone;
    if (!phoneNumber) {
      console.log(`⚠️ [SMS-NOTIFICATION] No phone number found for application: ${data.applicationId}`);
      return { success: false, error: 'No phone number available' };
    }
    
    // Extract first name and business legal name from form data
    const firstName = data.firstName || formData?.step4?.firstName || formData?.step4?.applicantFirstName || 'Customer';
    const businessLegalName = data.businessLegalName || formData?.step3?.legalBusinessName || formData?.step3?.businessName || 'your business';
    
    // Check if SMS was already sent for this trigger
    const existingLogResult = await db.execute(sql`
      SELECT id FROM sms_messages 
      WHERE applicationId = ${data.applicationId} 
      AND automation_type = ${data.trigger}
      AND status IN ('sent', 'delivered')
      LIMIT 1
    `);
    
    if (existingLogResult.rows.length > 0) {
      console.log(`⚠️ [SMS-NOTIFICATION] SMS already sent for trigger ${data.trigger} on application ${data.applicationId}`);
      return { success: false, error: 'SMS already sent for this trigger' };
    }
    
    // Generate SMS message based on trigger
    const message = generateSMSMessage(data.trigger, {
      firstName,
      businessLegalName,
      documentName: data.documentName,
      documentCategory: data.documentCategory
    });
    
    if (!message) {
      console.error(`❌ [SMS-NOTIFICATION] No message template for trigger: ${data.trigger}`);
      return { success: false, error: 'No message template found' };
    }
    
    console.log(`📱 [SMS-NOTIFICATION] Sending SMS to ${phoneNumber}: ${message}`);
    
    // Send SMS via Twilio
    const smsResult = await sendTwilioSMS(phoneNumber, message);
    
    // Log SMS to database
    await logSMSToDatabase({
      applicationId: data.applicationId,
      phoneNumber,
      message,
      trigger: data.trigger,
      status: smsResult.success ? 'sent' : 'failed',
      twilioSid: smsResult.sid,
      errorMessage: smsResult.error
    });
    
    if (smsResult.success) {
      console.log(`✅ [SMS-NOTIFICATION] SMS sent successfully. SID: ${smsResult.sid}`);
      return { success: true, message: 'SMS sent successfully' };
    } else {
      console.error(`❌ [SMS-NOTIFICATION] SMS failed: ${smsResult.error}`);
      return { success: false, error: smsResult.error };
    }
    
  } catch (error) {
    console.error('❌ [SMS-NOTIFICATION] Error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Generate SMS message based on trigger type
 */
function generateSMSMessage(trigger: string, data: { firstName: string; businessLegalName: string; documentName?: string; documentCategory?: string }): string | null {
  const { firstName, businessLegalName, documentName, documentCategory } = data;
  
  switch (trigger) {
    case 'new_application':
      return `${firstName}, we have received your application for funding for ${businessLegalName}. We will review it shortly and update you with the next steps.`;
      
    case 'in_review':
      return `We are now reviewing your application and will update you shortly.`;
      
    case 'document_rejected':
      if (!documentName || !documentCategory) {
        console.error('❌ [SMS-NOTIFICATION] Document name and category required for rejection message');
        return null;
      }
      return `We have reviewed your documents and the following document '${documentName} (${documentCategory})' was rejected. You will need to click here https://clientportal.boreal.financial/dashboard to upload the correct document. If you have any questions, you can contact us at info@boreal.financial.`;
      
    case 'all_documents_accepted':
      return `We have approved of all your required documents and will now be engaging with the lenders.`;
      
    case 'sent_to_lender':
      return `We are happy to announce your application has been finalized and is now in the hands of the lenders who are the best match for your application and requirements. This will generally take 2–4 days before we hear a response. Please be patient and we will be reaching out soon.`;
    
    case 'loan_approved':
      return `Congratulations ${firstName}! Your loan application for ${businessLegalName} has been approved. We will contact you shortly with the next steps and funding details.`;
      
    case 'loan_rejected':
      return `Dear ${firstName}, unfortunately we cannot approve your loan application for ${businessLegalName} at this time. You may be eligible to reapply in the future. Please contact us if you have questions.`;
      
    case 'loan_funded':
      return `Great news ${firstName}! Your loan for ${businessLegalName} has been funded and disbursed. Please check your account to confirm receipt of funds.`;
      
    case 'document_accepted':
      return `Your document "${documentName}" has been approved and processed. Thank you for providing the required documentation.`;
      
    default:
      console.error(`❌ [SMS-NOTIFICATION] Unknown trigger: ${trigger}`);
      return null;
  }
}

/**
 * Send SMS via Twilio
 */
async function sendTwilioSMS(to: string, body: string): Promise<{ success: boolean; sid?: string; error?: string }> {
  try {
    // Check if Twilio credentials are available
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER;
    
    if (!accountSid || !authToken || !fromNumber) {
      console.error('❌ [SMS-NOTIFICATION] Missing Twilio credentials');
      return { success: false, error: 'Twilio credentials not configured' };
    }
    
    // Import Twilio dynamically
    const { default: twilio } = await import('twilio');
    const client = twilio(accountSid, authToken);
    
    // Send SMS
    const message = await client.messages.create({
      body,
      from: fromNumber,
      to
    });
    
    console.log(`✅ [SMS-NOTIFICATION] Twilio SMS sent. SID: ${message.sid}`);
    return { success: true, sid: message.sid };
    
  } catch (error) {
    console.error('❌ [SMS-NOTIFICATION] Twilio error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Twilio SMS failed' 
    };
  }
}

/**
 * Log SMS to database
 */
async function logSMSToDatabase(logEntry: SMSLogEntry): Promise<void> {
  try {
    await db.execute(sql`
      INSERT INTO sms_messages (
        from_number,
        to_number,
        body,
        direction,
        status,
        contact_id,
        applicationId,
        is_automated,
        automation_type,
        message_sid,
        error_message,
        createdAt,
        updatedAt
      ) VALUES (
        ${process.env.TWILIO_FROM_NUMBER || process.env.TWILIO_PHONE_NUMBER || '+17753146801'},
        ${logEntry.phoneNumber},
        ${logEntry.message},
        'outbound',
        ${logEntry.status},
        NULL,
        ${logEntry.applicationId},
        true,
        ${logEntry.trigger},
        ${logEntry.twilioSid || null},
        ${logEntry.errorMessage || null},
        NOW(),
        NOW()
      )
    `);
    
    console.log(`📋 [SMS-NOTIFICATION] SMS logged to database for application: ${logEntry.applicationId}`);
  } catch (error) {
    console.error('❌ [SMS-NOTIFICATION] Database logging error:', error);
    // Don't throw - SMS was sent successfully, logging failure shouldn't break the flow
  }
}

/**
 * Check if all required documents are accepted
 */
export async function checkAllDocumentsAccepted(applicationId: string): Promise<boolean> {
  try {
    const result = await db.execute(sql`
      SELECT 
        COUNT(*) as total_required,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_count
      FROM documents 
      WHERE applicationId = ${applicationId} 
      AND is_required = true
    `);
    
    const row = result.rows[0] as any;
    const totalRequired = parseInt(row.total_required);
    const acceptedCount = parseInt(row.accepted_count);
    
    console.log(`📋 [SMS-NOTIFICATION] Document status for ${applicationId}: ${acceptedCount}/${totalRequired} accepted`);
    
    return totalRequired > 0 && acceptedCount === totalRequired;
  } catch (error) {
    console.error('❌ [SMS-NOTIFICATION] Error checking document status:', error);
    return false;
  }
}

/**
 * Check if OCR and Banking Analysis are completed
 */
export async function checkAnalysisCompleted(applicationId: string): Promise<boolean> {
  try {
    // Check if OCR results exist
    const ocrResult = await db.execute(sql`
      SELECT COUNT(*) as ocr_count
      FROM ocr_results 
      WHERE applicationId = ${applicationId}
    `);
    
    // Check if banking analysis exists
    const bankingResult = await db.execute(sql`
      SELECT COUNT(*) as banking_count
      FROM banking_analysis 
      WHERE applicationId = ${applicationId}
    `);
    
    const ocrCount = parseInt((ocrResult.rows[0] as any).ocr_count);
    const bankingCount = parseInt((bankingResult.rows[0] as any).banking_count);
    
    console.log(`📋 [SMS-NOTIFICATION] Analysis status for ${applicationId}: OCR=${ocrCount}, Banking=${bankingCount}`);
    
    // Consider analysis completed if either OCR or banking analysis exists
    return ocrCount > 0 || bankingCount > 0;
  } catch (error) {
    console.error('❌ [SMS-NOTIFICATION] Error checking analysis status:', error);
    return false;
  }
}