/**
 * SMS Stage Notifications System
 * Comprehensive SMS notification system for loan application stage transitions
 */

import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import twilio from 'twilio';

const router = Router();

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

/**
 * Trigger SMS notification for stage transitions
 */
async function sendStageTransitionSMS(applicationId: string, fromStage: string, toStage: string): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    console.log(`📱 [SMS-STAGE] Processing stage transition: ${fromStage} → ${toStage} for application ${applicationId}`);
    
    // Get application data and phone number
    const applicationResult = await db.execute(sql`
      SELECT form_data, stage 
      FROM applications 
      WHERE id = ${applicationId}
      LIMIT 1
    `);
    
    if (!applicationResult.rows.length) {
      console.error(`❌ [SMS-STAGE] Application not found: ${applicationId}`);
      return { success: false, error: 'Application not found' };
    }
    
    const application = applicationResult.rows[0] as any;
    const formData = application.form_data;
    
    // Extract phone number from Step 4 data
    const phoneNumber = formData?.step4?.phone;
    if (!phoneNumber) {
      console.log(`⚠️ [SMS-STAGE] No phone number found for application: ${applicationId}`);
      return { success: false, error: 'No phone number available' };
    }
    
    // Extract applicant information
    const firstName = formData?.step4?.firstName || formData?.step4?.applicantFirstName || 'Customer';
    const businessName = formData?.step3?.businessName || formData?.step3?.legalBusinessName || 'your business';
    const requestedAmount = formData?.step1?.requestedAmount || 'requested';
    
    // Generate SMS message based on stage transition
    let message = '';
    
    if (toStage === 'In Review') {
      message = `Hi ${firstName}, your loan application for ${businessName} is now under review. We'll contact you within 24-48 hours with updates. Reference: ${applicationId.slice(-6)}`;
    } else if (toStage === 'Accepted') {
      message = `Great news ${firstName}! Your loan application for ${businessName} has been approved. Our team will contact you shortly to finalize terms. Reference: ${applicationId.slice(-6)}`;
    } else if (toStage === 'Denied') {
      message = `Hi ${firstName}, after careful review, we're unable to approve your loan application for ${businessName} at this time. Our team will call you to discuss alternatives. Reference: ${applicationId.slice(-6)}`;
    } else if (toStage === 'Off to Lender') {
      message = `Hi ${firstName}, good news! Your application for ${businessName} has been sent to our lending partners for final approval. You should hear back within 2-3 business days. Reference: ${applicationId.slice(-6)}`;
    } else if (toStage === 'Requires Docs') {
      message = `Hi ${firstName}, we're reviewing your application for ${businessName} and need additional documentation. Please check your portal and upload the required documents. Reference: ${applicationId.slice(-6)}`;
    } else {
      console.log(`📱 [SMS-STAGE] No SMS template for stage: ${toStage}`);
      return { success: false, error: 'No SMS template for this stage' };
    }
    
    console.log(`📱 [SMS-STAGE] Sending SMS to ${phoneNumber}: ${message}`);
    
    // Send SMS via Twilio using dedicated number
    const smsResult = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER, // +18254511768
      to: phoneNumber,
    });
    
    // Log SMS to database using correct schema
    await db.execute(sql`
      INSERT INTO sms_messages (
        from_number,
        to_number,
        body,
        direction,
        applicationId,
        automation_type,
        status,
        twilio_sid,
        createdAt
      ) VALUES (
        ${process.env.TWILIO_PHONE_NUMBER || '+18254511768'},
        ${phoneNumber},
        ${message},
        'outbound',
        ${applicationId},
        'stage_transition',
        'sent',
        ${smsResult.sid},
        NOW()
      )
    `);
    
    console.log(`✅ [SMS-STAGE] SMS sent successfully. SID: ${smsResult.sid}`);
    return { success: true, message: 'SMS sent successfully' };
    
  } catch (error: unknown) {
    console.error('❌ [SMS-STAGE] Error:', error);
    return { success: false, error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error' };
  }
}

/**
 * POST /api/sms-notifications/stage-transition
 * Manual trigger for stage transition SMS
 */
router.post('/stage-transition', async (req: any, res: any) => {
  try {
    const { applicationId, fromStage, toStage } = req.body;
    
    if (!applicationId || !toStage) {
      return res.status(400).json({
        success: false,
        error: 'applicationId and toStage are required'
      });
    }
    
    const result = await sendStageTransitionSMS(applicationId, fromStage, toStage);
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Stage transition SMS sent successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.error
      });
    }
    
  } catch (error: unknown) {
    console.error('❌ [SMS-STAGE] API error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send stage transition SMS'
    });
  }
});

/**
 * POST /api/sms-notifications/test
 * Test SMS notification system
 */
router.post('/test', async (req: any, res: any) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber and message are required'
      });
    }
    
    console.log(`🧪 [SMS-TEST] Sending test SMS to ${phoneNumber}: ${message}`);
    
    const smsResult = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!,
      to: phoneNumber,
    });
    
    console.log(`✅ [SMS-TEST] Test SMS sent successfully. SID: ${smsResult.sid}`);
    
    res.json({
      success: true,
      message: 'Test SMS sent successfully',
      sid: smsResult.sid
    });
    
  } catch (error: unknown) {
    console.error('❌ [SMS-TEST] Error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Failed to send test SMS'
    });
  }
});

// Export the SMS function for use in other routes
export { sendStageTransitionSMS };
export default router;