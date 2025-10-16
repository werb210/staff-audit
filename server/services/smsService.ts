/**
 * 📱 SMS SERVICE
 * Unified SMS service for sending template-based messages
 */

import { sendEnhancedSMS, SMS_TEMPLATES } from '../routes/enhancedSmsTemplates';

/**
 * Send SMS using template with direct phone number and data
 * Used by cron jobs and other automated systems
 */
export async function sendSmsTemplate(
  templateType: keyof typeof SMS_TEMPLATES,
  phoneNumber: string,
  templateData: Record<string, string>
): Promise<{ success: boolean; message?: string; error?: string; smsId?: string }> {
  try {
    console.log(`📱 [SMS-SERVICE] Sending ${templateType} SMS to ${phoneNumber}`);
    
    // Get SMS template
    const smsTemplate = SMS_TEMPLATES[templateType];
    if (!smsTemplate) {
      console.error(`❌ [SMS-SERVICE] Invalid template type: ${templateType}`);
      return { success: false, error: 'Invalid SMS template type' };
    }
    
    // Format message with provided data
    let message = smsTemplate.template;
    Object.entries(templateData).forEach(([key, value]) => {
      message = message.replace(`{${key}}`, value);
    });
    
    console.log(`📱 [SMS-SERVICE] Sending to ${phoneNumber}: ${message.substring(0, 50)}...`);
    
    // Import Twilio dynamically to avoid startup issues
    const twilio = await import('twilio');
    const twilioClient = twilio.default(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
    
    // Send SMS via Twilio
    const smsResult = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER!, // +18254511768
      to: phoneNumber,
    });
    
    console.log(`✅ [SMS-SERVICE] SMS sent successfully: ${smsResult.sid}`);
    
    return {
      success: true,
      message: 'SMS sent successfully',
      smsId: smsResult.sid
    };
    
  } catch (error) {
    console.error('❌ [SMS-SERVICE] SMS sending failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown SMS error'
    };
  }
}

/**
 * Send SMS for specific application using existing enhanced SMS system
 */
export async function sendSmsForApplication(
  applicationId: string,
  templateType: keyof typeof SMS_TEMPLATES,
  customData?: Record<string, string>
): Promise<{ success: boolean; message?: string; error?: string; smsId?: string }> {
  return sendEnhancedSMS(applicationId, templateType, customData);
}