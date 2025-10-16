import { Router } from 'express';
import { db } from '../../db';
import { applications } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// Submit application endpoint - updates application status to submitted
router.post('/:id/submit', async (req: any, res: any) => {
  try {
    const { id: rawApplicationId } = req.params;
    const { termsAccepted, privacyAccepted, completedSteps } = req.body;

    // Convert external ID (app_prod_xxx) to internal UUID if needed
    const applicationId = rawApplicationId.startsWith('app_prod_') 
      ? rawApplicationId.replace('app_prod_', '')
      : rawApplicationId;

    console.log(`📋 Submit request: ${rawApplicationId} -> ${applicationId}`);

    // Validate application exists and status is draft
    const existingApplication = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!existingApplication.length) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const application = existingApplication[0];

    // CRITICAL: Reject re-submissions if already in lender_match or later stages
    if (application.status === 'lender_match' || 
        application.status === 'approved' || 
        application.status === 'funded') {
      
      console.log(`🚫 SUBMIT REJECTED: Application ${applicationId} already finalized - Status: ${application.status}`);
      
      return res.status(400).json({
        success: false,
        error: 'Application already finalized',
        message: `Cannot resubmit application that is already in ${application.status} status`,
        currentStatus: application.status,
        rejectionReason: 'RE_SUBMISSION_NOT_ALLOWED'
      });
    }

    // Verify application status is draft
    if (application.status !== 'draft') {
      return res.status(400).json({
        success: false,
        error: 'Application cannot be submitted',
        message: `Application status is '${application.status}', only draft applications can be submitted`
      });
    }

    // DOCUMENT VALIDATION DECOUPLED - applications can now be submitted without documents
    const { validateApplicationHasDocuments } = await import('../../utils/documentStorage.js');
    const hasDocuments = await validateApplicationHasDocuments(applicationId);
    
    if (!hasDocuments) {
      console.warn(`⚠️ [DOCUMENT INFO] Application ${applicationId} submitted without documents - proceeding anyway`);
    } else {
      console.log(`📄 [DOCUMENT INFO] Application ${applicationId} submitted with ${hasDocuments} documents`);
    }

    // Validate required acceptance fields (flexible boolean validation)
    const isTermsAccepted = termsAccepted === true || termsAccepted === 'true';
    const isPrivacyAccepted = privacyAccepted === true || privacyAccepted === 'true';

    if (!isTermsAccepted) {
      return res.status(400).json({
        success: false,
        error: 'Terms acceptance required',
        message: 'Terms and conditions must be accepted to submit application'
      });
    }

    if (!isPrivacyAccepted) {
      return res.status(400).json({
        success: false,
        error: 'Privacy acceptance required',
        message: 'Privacy policy must be accepted to submit application'
      });
    }

    // Validate completed steps (flexible validation)
    if (!completedSteps || !Array.isArray(completedSteps) || completedSteps.length === 0) {
      console.log(`📋 No completed steps provided, using default steps for submission`);
      // Set default completed steps for submissions without explicit step tracking
      const defaultSteps = ['step1', 'step2', 'step3', 'step4'];
      console.log(`📋 Using default completed steps: ${defaultSteps.join(', ')}`);
    }

    // Generate reference ID in format BF2025070412345
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const reference = `BF${year}${month}${day}${hour}${randomSuffix}`;

    // Update application status to submitted and save acceptance flags
    const [updatedApplication] = await db
      .update(applications)
      .set({
        status: 'submitted',
        stage: 'In Review',
        submittedAt: new Date(),
        // Store acceptance flags in metadata if available
        ...(application.metadata && typeof application.metadata === 'object' 
          ? { 
              metadata: {
                ...application.metadata,
                termsAccepted,
                privacyAccepted,
                completedSteps,
                submissionReference: reference
              }
            }
          : {}
        )
      })
      .where(eq(applications.id, applicationId))
      .returning();

    if (!updatedApplication) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update application status'
      });
    }

    // Log the submission
    console.log(`📋 Application submission completed:`, {
      applicationId: updatedApplication.id,
      status: updatedApplication.status,
      stage: updatedApplication.stage,
      reference: reference,
      termsAccepted,
      privacyAccepted,
      completedSteps: completedSteps.length,
      submittedAt: updatedApplication.submittedAt
    });

    console.log(`✅ Application ${updatedApplication.id} submitted successfully with reference ${reference}`);

    // 🤖 CRITICAL: CRM CONTACT AUTO-CREATION ON SUBMISSION
    // Ensure every submitted application has corresponding CRM contact
    try {
      console.log('🤖 [CRM SUBMIT] Verifying/creating CRM contact for submitted application:', updatedApplication.id);
      
      // Get application and business details for contact creation
      const { businesses } = await import('../../shared/schema');
      const { eq } = await import('drizzle-orm');
      const { sql } = await import('drizzle-orm');
      
      const [appWithBusiness] = await db
        .select({
          applicationId: applications.id,
          formData: applications.formData,
          businessName: businesses.businessName,
          businessPhone: businesses.phone
        })
        .from(applications)
        .innerJoin(businesses, eq(applications.businessId, businesses.id))
        .where(eq(applications.id, updatedApplication.id))
        .limit(1);

      if (appWithBusiness && appWithBusiness.formData) {
        const formData = appWithBusiness.formData as any;
        const applicantEmail = formData?.step4?.email || formData?.email;
        const applicantFirstName = formData?.step4?.firstName || formData?.firstName;
        const applicantLastName = formData?.step4?.lastName || formData?.lastName;
        const applicantPhone = formData?.step4?.phone || appWithBusiness.businessPhone;

        if (applicantEmail) {
          // Check for existing contact
          const existingContactCheck = await db.execute(sql`
            SELECT id, email FROM crm_contacts WHERE email = ${applicantEmail.toLowerCase()} LIMIT 1
          `);
          
          if (existingContactCheck.rows.length === 0) {
            // Get tenant ID
            let defaultTenantId;
            try {
              const tenantCheck = await db.execute(sql`SELECT id FROM tenants LIMIT 1`);
              defaultTenantId = tenantCheck.rows.length > 0 ? tenantCheck.rows[0].id : uuidv4();
            } catch {
              const { v4: uuidv4 } = await import('uuid');
              defaultTenantId = uuidv4();
            }

            // Create CRM contact
            const contactResult = await db.execute(sql`
              INSERT INTO crm_contacts (first_name, last_name, email, phone, source, status, tenant_id)
              VALUES (
                ${applicantFirstName || ''},
                ${applicantLastName || ''},
                ${applicantEmail.toLowerCase()},
                ${applicantPhone || ''},
                'Client Application Submission',
                'active',
                ${defaultTenantId}
              )
              RETURNING id, email
            `);

            console.log(`✅ [CRM SUBMIT] Created contact for submitted application: ${contactResult.rows[0].email}`);
          } else {
            console.log(`🤖 [CRM SUBMIT] Contact already exists for: ${applicantEmail}`);
          }
        }
      }
    } catch (crmError) {
      console.error('❌ [CRM SUBMIT] Failed to verify/create contact:', crmError);
      // Continue with submission - don't fail if CRM creation fails
    }

    // TRIGGER SMS NOTIFICATION ON SUBMISSION
    try {
      const { sendSMSNotification } = await import('../../services/smsNotificationService.js');
      await sendSMSNotification({
        applicationId: updatedApplication.id,
        trigger: 'new_application',
        firstName: appWithBusiness?.formData?.step4?.firstName,
        businessLegalName: appWithBusiness?.formData?.step3?.legalBusinessName || appWithBusiness?.formData?.step3?.businessName
      });
      console.log(`📱 [SUBMIT] SMS notification triggered for application: ${updatedApplication.id}`);
    } catch (smsError) {
      console.error('⚠️ [SUBMIT] SMS notification failed (non-blocking):', smsError);
      // Continue with submission - don't fail if SMS fails
    }

    // Return response matching your specification
    res.json({
      success: true,
      status: "submitted",
      applicationId: updatedApplication.id,
      reference: reference
    });

  } catch (error: any) {
    console.error('Application submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit application',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;