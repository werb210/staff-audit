/**
 * SMS Notification Testing Endpoint
 * Provides comprehensive testing interface for SMS notification system
 */

import { Router } from 'express';
import { RBACRequest } from '../middleware/rbacAuth';
import { db } from '../db';
import { applications } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { sendSMSNotification } from '../services/smsNotificationService';

const router = Router();

/**
 * GET /api/sms-test/triggers
 * List all available SMS triggers and their message templates
 */
router.get('/triggers', async (req: any, res: any) => {
  try {
    const triggers = {
      stage_transitions: {
        'in_review': 'Application moved to review stage',
        'sent_to_lender': 'Application sent to lender',
        'qualified': 'Loan pre-qualified',
        'proposal': 'Loan proposal ready',
        'decision': 'Loan decision rendered',
        'closed_won': 'Loan approved and closed',
        'closed_lost': 'Loan application closed'
      },
      document_events: {
        'document_accepted': 'Document approved',
        'document_rejected': 'Document rejected',
        'documents_complete': 'All documents received',
        'document_required': 'Additional document required'
      },
      loan_decisions: {
        'loan_approved': 'Loan application approved',
        'loan_rejected': 'Loan application rejected',
        'loan_funded': 'Loan funding complete'
      },
      general: {
        'custom_message': 'Custom notification',
        'reminder': 'General reminder',
        'update': 'Status update'
      }
    };

    res.json({
      success: true,
      triggers,
      totalTriggers: Object.values(triggers).reduce((acc, curr) => acc + Object.keys(curr).length, 0)
    });

  } catch (error: unknown) {
    console.error('❌ [SMS-TEST] Error listing triggers:', error);
    res.status(500).json({ error: 'Failed to list SMS triggers' });
  }
});

/**
 * POST /api/sms-test/:applicationId/:trigger
 * Test specific SMS trigger for an application
 */
router.post('/:applicationId/:trigger', async (req: any, res: any) => {
  try {
    const { applicationId, trigger } = req.params;
    const { customMessage, metadata } = req.body;

    console.log(`🧪 [SMS-TEST] Testing trigger "${trigger}" for application ${applicationId}`);

    // Verify application exists
    const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Extract phone number for verification
    let phoneNumber = 'N/A';
    try {
      if (application.formData && typeof application.formData === 'object') {
        const formData = application.formData as any;
        phoneNumber = formData.step4?.phone || formData.contactPhone || 'N/A';
      }
    } catch (parseError) {
      console.warn('⚠️ [SMS-TEST] Could not parse form data for phone number');
    }

    // Send test SMS
    const startTime = Date.now();
    const smsResult = await sendSMSNotification({
      applicationId,
      trigger: trigger as any,
      customMessage,
      metadata
    });
    const responseTime = Date.now() - startTime;

    if (smsResult.success) {
      console.log(`✅ [SMS-TEST] Test SMS sent successfully in ${responseTime}ms`);
      
      res.json({
        success: true,
        message: 'Test SMS notification sent successfully',
        details: {
          applicationId,
          trigger,
          phoneNumber,
          smsId: smsResult.smsId,
          responseTime: `${responseTime}ms`,
          businessName: application.legalBusinessName || application.businessName,
          testMode: true
        }
      });
    } else {
      console.error(`❌ [SMS-TEST] Test SMS failed: ${smsResult.error}`);
      
      res.status(500).json({
        success: false,
        error: 'Test SMS notification failed',
        details: {
          applicationId,
          trigger,
          phoneNumber,
          errorMessage: smsResult.error,
          responseTime: `${responseTime}ms`,
          testMode: true
        }
      });
    }

  } catch (error: unknown) {
    console.error('❌ [SMS-TEST] Error in test endpoint:', error);
    res.status(500).json({ error: 'SMS test endpoint failed' });
  }
});

/**
 * GET /api/sms-test/:applicationId/phone
 * Get phone number from application for SMS testing
 */
router.get('/:applicationId/phone', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;

    // Get application data
    const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    let phoneNumber = null;
    let source = 'not_found';

    try {
      if (application.formData && typeof application.formData === 'object') {
        const formData = application.formData as any;
        
        // Try multiple potential phone number locations
        if (formData.step4?.phone) {
          phoneNumber = formData.step4.phone;
          source = 'formData.step4.phone';
        } else if (formData.contactPhone) {
          phoneNumber = formData.contactPhone;
          source = 'formData.contactPhone';
        } else if (formData.phone) {
          phoneNumber = formData.phone;
          source = 'formData.phone';
        } else if (formData.businessPhone) {
          phoneNumber = formData.businessPhone;
          source = 'formData.businessPhone';
        }
      }
    } catch (parseError) {
      console.warn('⚠️ [SMS-TEST] Could not parse form data:', parseError);
    }

    res.json({
      success: true,
      applicationId,
      businessName: application.legalBusinessName || application.businessName,
      phoneNumber,
      source,
      hasPhoneNumber: !!phoneNumber,
      formDataStructure: application.formData ? Object.keys(application.formData as any) : []
    });

  } catch (error: unknown) {
    console.error('❌ [SMS-TEST] Error getting phone number:', error);
    res.status(500).json({ error: 'Failed to get phone number' });
  }
});

/**
 * POST /api/sms-test/bulk/:trigger
 * Test SMS trigger for multiple applications
 */
router.post('/bulk/:trigger', async (req: any, res: any) => {
  try {
    const { trigger } = req.params;
    const { applicationIds, customMessage } = req.body;

    if (!applicationIds || !Array.isArray(applicationIds)) {
      return res.status(400).json({ error: 'applicationIds array is required' });
    }

    console.log(`🚀 [SMS-BULK] Testing trigger "${trigger}" for ${applicationIds.length} applications`);

    const results = [];
    
    for (const applicationId of applicationIds) {
      try {
        const startTime = Date.now();
        const smsResult = await sendSMSNotification({
          applicationId,
          trigger: trigger as any,
          customMessage
        });
        const responseTime = Date.now() - startTime;

        results.push({
          applicationId,
          success: smsResult.success,
          smsId: smsResult.smsId,
          error: smsResult.error,
          responseTime: `${responseTime}ms`
        });

        // Add small delay between bulk sends
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error: unknown) {
        results.push({
          applicationId,
          success: false,
          error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error',
          responseTime: 'N/A'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`📊 [SMS-BULK] Bulk test complete: ${successCount} success, ${failureCount} failures`);

    res.json({
      success: true,
      trigger,
      totalApplications: applicationIds.length,
      successCount,
      failureCount,
      results
    });

  } catch (error: unknown) {
    console.error('❌ [SMS-BULK] Error in bulk test:', error);
    res.status(500).json({ error: 'Bulk SMS test failed' });
  }
});

export default router;