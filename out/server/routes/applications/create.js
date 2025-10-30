import { Router } from 'express';
import { db } from '../../db';
import { applications, businesses, expectedDocuments, lenderProducts, documents } from '../../../shared/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';
import { DocumentRequirementsService } from '../../services/documentRequirementsService';
import fs from 'fs';
const router = Router();
// DEBUG: Log all requests hitting this router
router.use('*', (req, res, next) => {
    console.log(`🚀 APPLICATION CREATE ROUTER HIT - ${req.method} ${req.originalUrl} - Base: ${req.baseUrl}, Path: ${req.path}`);
    next();
});
// TEST ENDPOINT: Simple test to verify routing is working
router.post('/test-logging', (req, res) => {
    console.log('🟢 TEST ENDPOINT HIT: Logging verification successful');
    console.log('🟢 TEST ENDPOINT: Method:', req.method, 'URL:', req.originalUrl);
    console.log('🟢 TEST ENDPOINT: Body keys:', Object.keys(req.body));
    res.json({
        success: true,
        message: 'Test endpoint working - logs should appear in console',
        timestamp: new Date().toISOString()
    });
});
// Create new application endpoint - FULLY PUBLIC (no auth required)
router.post('/', async (req, res) => {
    console.log('📝 Application creation request received');
    // 🛑 BLOCK INTERNAL TEST APPLICATIONS FROM ENTERING SALES PIPELINE
    const submittedBusinessName = req.body?.step3?.businessName || req.body?.formData?.step3?.businessName || '';
    const submittedApplicantEmail = req.body?.step4?.email || req.body?.formData?.step4?.email || '';
    // Detect test applications by business name or email patterns
    const isTestApplication = submittedBusinessName.includes('Test Corp') ||
        submittedBusinessName.includes('Test LLC') ||
        submittedBusinessName.includes('Test Company') ||
        submittedBusinessName.includes('Test Inc') ||
        submittedBusinessName.includes('Webhook Test') ||
        submittedBusinessName.includes('Format Test') ||
        submittedBusinessName.includes('Debug Test') ||
        submittedBusinessName.includes('E2E Test') ||
        submittedBusinessName.includes('Final Test') ||
        submittedBusinessName.includes('Lender Match Test') ||
        submittedApplicantEmail.includes('+test@boreal.financial') ||
        submittedApplicantEmail.includes('test@') ||
        submittedApplicantEmail.includes('@test.com') ||
        submittedApplicantEmail.includes('debug@') ||
        submittedApplicantEmail.includes('webhook@');
    if (isTestApplication) {
        console.log('🛑 BLOCKING INTERNAL TEST APPLICATION:', {
            businessName: submittedBusinessName,
            applicantEmail: submittedApplicantEmail,
            reason: 'Internal test submission detected'
        });
        return res.status(202).json({
            ignored: true,
            reason: 'Internal test submission blocked from sales pipeline',
            businessName: submittedBusinessName,
            applicantEmail: submittedApplicantEmail,
            message: 'Test applications are not added to production sales pipeline'
        });
    }
    // ✅ MONITOR: Application received
    console.log("✅ [MONITOR] Application received");
    console.log(`📥 [MONITOR] Business Name: ${submittedBusinessName}`);
    console.log(`📧 [MONITOR] Contact Email: ${submittedApplicantEmail}`);
    console.log(`💰 [MONITOR] Requested Amount: ${req.body?.step1?.requestedAmount || req.body?.formData?.step1?.requestedAmount || 'Not specified'}`);
    console.log("📦 [MONITOR] Payload Keys:", Object.keys(req.body));
    // STAFF REQUIREMENT 2: Add timestamped log file if logs disappear
    try {
        fs.appendFileSync("./logs/application_log.txt", `[${new Date().toISOString()}] Application received: ${JSON.stringify(req.body)}\n`);
    }
    catch (logError) {
        console.error("❌ Failed to write to application log file:", logError);
    }
    // CRITICAL: Log all top-level keys to detect format mismatch
    console.log("🔍 TOP-LEVEL KEYS ANALYSIS:", {
        allKeys: Object.keys(req.body),
        hasStep1: 'step1' in req.body,
        hasStep3: 'step3' in req.body,
        hasStep4: 'step4' in req.body,
        hasFormData: 'formData' in req.body,
        hasLegacyFields: ['legalName', 'firstName', 'lastName', 'businessName'].some(key => key in req.body),
        legacyFieldsDetected: Object.keys(req.body).filter(key => ['legalName', 'firstName', 'lastName', 'businessName', 'applicantFirstName', 'applicantLastName'].includes(key))
    });
    // Verify step-based data structure - check both direct and nested formats
    const directStep1 = req.body.step1 && typeof req.body.step1 === 'object';
    const directStep3 = req.body.step3 && typeof req.body.step3 === 'object';
    const directStep4 = req.body.step4 && typeof req.body.step4 === 'object';
    const nestedStep1 = req.body.formData?.step1 && typeof req.body.formData.step1 === 'object';
    const nestedStep3 = req.body.formData?.step3 && typeof req.body.formData.step3 === 'object';
    const nestedStep4 = req.body.formData?.step4 && typeof req.body.formData.step4 === 'object';
    console.log('🔍 DEBUG VALIDATION:', {
        directStep1,
        directStep3,
        directStep4,
        nestedStep1,
        nestedStep3,
        nestedStep4,
        hasFormData: !!req.body.formData,
        formDataKeys: req.body.formData ? Object.keys(req.body.formData) : []
    });
    const hasStep1 = directStep1 || nestedStep1;
    const hasStep3 = directStep3 || nestedStep3;
    const hasStep4 = directStep4 || nestedStep4;
    console.log('✅ Step Validation:', {
        hasStep1,
        hasStep3,
        hasStep4,
        step1Keys: hasStep1 ? Object.keys(req.body.step1 || req.body.formData?.step1) : 'Missing',
        step3Keys: hasStep3 ? Object.keys(req.body.step3 || req.body.formData?.step3) : 'Missing',
        step4Keys: hasStep4 ? Object.keys(req.body.step4 || req.body.formData?.step4) : 'Missing'
    });
    // Check critical fields from both formats
    const requestedAmount = req.body.step1?.requestedAmount || req.body.formData?.step1?.requestedAmount || req.body.requestedAmount;
    const businessName = req.body.step3?.businessName || req.body.formData?.step3?.businessName || req.body.businessName;
    const email = req.body.step4?.email || req.body.formData?.step4?.email || req.body.email;
    const firstName = req.body.step4?.firstName || req.body.formData?.step4?.firstName || req.body.firstName;
    const lastName = req.body.step4?.lastName || req.body.formData?.step4?.lastName || req.body.lastName;
    // 🔧 STAFF PATCH: Extract and validate numberOfEmployees field
    const step3 = req.body.step3 || req.body.formData?.step3;
    if (step3) {
        const { numberOfEmployees } = step3;
        // Ensure it's a valid number
        const safeNumberOfEmployees = Number(numberOfEmployees ?? 0);
        console.log('[VALIDATION] number_of_employees:', safeNumberOfEmployees);
        console.log('[VALIDATION] numberOfEmployees validation:', {
            raw: numberOfEmployees,
            converted: safeNumberOfEmployees,
            isValid: !isNaN(safeNumberOfEmployees) && isFinite(safeNumberOfEmployees)
        });
    }
    console.log('🔍 Critical Fields Check:', {
        requestedAmount,
        businessName,
        email,
        firstName,
        lastName,
        allPresent: !!(requestedAmount && businessName && email && firstName && lastName)
    });
    // Determine application source and version for traceability
    const applicationSource = req.body.source ||
        req.headers['x-client-version'] ||
        (req.body.step1 ? 'client-v2-step-based' : 'client-v1-legacy');
    console.log(`📊 SOURCE TRACKING:`, {
        source: applicationSource,
        userAgent: req.headers['user-agent'],
        origin: req.headers.origin,
        detectedFormat: req.body.step1 ? 'step-based' : 'flat-legacy'
    });
    // STRICT LEGACY FORMAT REJECTION - Check for legacy fields first
    if (req.body.legalName || req.body.applicantFirstName || req.body.applicantLastName || req.body.businessName) {
        console.error("🚨 LEGACY FORMAT DETECTED - REJECTING APPLICATION");
        console.error("🚨 Legacy fields found:", {
            legalName: !!req.body.legalName,
            applicantFirstName: !!req.body.applicantFirstName,
            applicantLastName: !!req.body.applicantLastName,
            businessName: !!req.body.businessName
        });
        return res.status(400).json({
            error: "❌ Legacy field format detected. Application must use step1/step3/step4 structure.",
            rejectedFields: Object.keys(req.body).filter(key => ['legalName', 'applicantFirstName', 'applicantLastName', 'businessName', 'applicantSSN', 'operatingName'].includes(key))
        });
    }
    console.log("📝 Received Application Format:", {
        step1: !!req.body.step1,
        step3: !!req.body.step3,
        step4: !!req.body.step4,
        formDataWrapper: !!req.body.formData,
        rootKeys: Object.keys(req.body)
    });
    // 🚨 STAFF CRITICAL DEBUG BLOCK: Comprehensive try-catch around application creation
    try {
        console.log('🚨 APPLICATION CREATION DEBUG: Starting application creation process...');
        console.log('🚨 DEBUG: Raw req.body keys:', Object.keys(req.body));
        console.log('🚨 DEBUG: req.body.formData:', req.body.formData ? Object.keys(req.body.formData) : 'undefined');
        // STRICT STEP-BASED FORMAT ONLY - No legacy support
        let { step1, step2, step3, step4, applicationId: clientApplicationId } = req.body;
        // Check if data is wrapped in formData
        if (!step1 && !step3 && !step4 && req.body.formData) {
            console.log("🔄 Extracting from formData wrapper");
            const formData = req.body.formData;
            step1 = formData.step1;
            step2 = formData.step2;
            step3 = formData.step3;
            step4 = formData.step4;
        }
        // FIELD MAPPING: Apply legacy field name mappings before validation
        if (step1) {
            if (step1.fundingAmount) {
                step1.requestedAmount = step1.fundingAmount;
                console.log("🔄 Applied mapping: fundingAmount → requestedAmount");
            }
            if (step1.loanPurpose) {
                step1.use_of_funds = step1.loanPurpose;
                console.log("🔄 Applied mapping: loanPurpose → use_of_funds");
            }
        }
        if (step3) {
            if (step3.operatingName) {
                step3.businessName = step3.operatingName;
                console.log("🔄 Applied mapping: operatingName → businessName");
            }
            if (step3.legalName) {
                step3.legalBusinessName = step3.legalName;
                console.log("🔄 Applied mapping: legalName → legalBusinessName");
            }
        }
        if (step4) {
            if (step4.applicantFirstName) {
                step4.firstName = step4.applicantFirstName;
                console.log("🔄 Applied mapping: applicantFirstName → firstName");
            }
            if (step4.applicantLastName) {
                step4.lastName = step4.applicantLastName;
                console.log("🔄 Applied mapping: applicantLastName → lastName");
            }
            if (step4.applicantEmail) {
                step4.email = step4.applicantEmail;
                console.log("🔄 Applied mapping: applicantEmail → email");
            }
            if (step4.applicantPhone || step4.phoneNumber) {
                step4.phone = step4.applicantPhone || step4.phoneNumber;
                console.log("🔄 Applied mapping: applicantPhone/phoneNumber → phone");
            }
        }
        // ✅ FIX: Log step2 data for debugging
        console.log("🔧 STEP2 DEBUG:", {
            hasStep2: !!step2,
            step2Data: step2 ? Object.keys(step2) : 'missing',
            step2Content: step2
        });
        // STRICT SCHEMA ENFORCEMENT - Reject applications without proper step structure
        if (!step1 || !step3 || !step4) {
            console.error("🚨 REJECTED: Invalid application structure - missing required steps");
            console.error("🚨 STEP VALIDATION FAILED:", {
                hasStep1: !!step1,
                hasStep2: !!step2,
                hasStep3: !!step3,
                hasStep4: !!step4,
                receivedKeys: Object.keys(req.body),
                reason: "Application must contain step1, step3, and step4 objects"
            });
            return res.status(400).json({
                error: "❌ Invalid application structure. Missing step1, step3, or step4",
                required: ["step1", "step3", "step4"],
                received: {
                    step1: !!step1,
                    step3: !!step3,
                    step4: !!step4
                }
            });
        }
        // VALIDATE STEP KEYS - Ensure each step has required fields
        const step1Keys = Object.keys(step1);
        const step3Keys = Object.keys(step3);
        const step4Keys = Object.keys(step4);
        console.log("✅ STEP VALIDATION PASSED:", {
            step1Keys,
            step3Keys,
            step4Keys,
            step1HasRequestedAmount: !!step1.requestedAmount,
            step3HasBusinessName: !!step3.businessName,
            step4HasEmail: !!step4.email
        });
        // Validate critical fields in each step
        if (!step1.requestedAmount) {
            return res.status(400).json({
                error: "❌ step1 missing required field: requestedAmount"
            });
        }
        if (!step3.businessName) {
            return res.status(400).json({
                error: "❌ step3 missing required field: businessName"
            });
        }
        if (!step4.email) {
            return res.status(400).json({
                error: "❌ step4 missing required field: email"
            });
        }
        // ADD REQUESTED LOG LINE: Log incoming email
        console.log("📩 Incoming email:", step4.email);
        // 🚨 CRITICAL DEBUG: Step data extraction and numberOfEmployees destructuring
        console.log('🚨 DEBUG: step3 full object:', JSON.stringify(step3, null, 2));
        console.log('🚨 DEBUG: Extracting numberOfEmployees from:', {
            numberOfEmployees: step3.numberOfEmployees,
            numEmployees: step3.numEmployees,
            typeOfNumberOfEmployees: typeof step3.numberOfEmployees,
            typeOfNumEmployees: typeof step3.numEmployees
        });
        // 🔧 STAFF PATCH: Explicit numberOfEmployees destructuring with error handling
        const { numberOfEmployees } = step3;
        console.log('🚨 DEBUG: Destructured numberOfEmployees:', numberOfEmployees, 'Type:', typeof numberOfEmployees);
        // STEP-BASED PROCESSING ONLY
        const business = {
            businessName: step3.businessName || step4.businessName,
            legalBusinessName: step3.legalName || step3.legalBusinessName,
            businessType: step3.businessType,
            industry: step3.industry,
            yearEstablished: step3.yearEstablished,
            ein: step3.ein,
            address: step3.businessAddress,
            phone: step4.phoneNumber,
            website: step3.website,
            description: step3.description,
            numberOfEmployees: numberOfEmployees || step3.numEmployees
        };
        console.log('🚨 DEBUG: Business object created with numberOfEmployees:', business.numberOfEmployees);
        // 🔧 STAFF PATCH: Ensure all steps including step2 are captured in formFields
        const formFields = {
            step1,
            step2: step2 || {}, // ✅ FIX: Include step2 data from client
            step3: {
                ...step3,
                numberOfEmployees: Number(step3.numberOfEmployees || step3.numEmployees || 0)
            },
            step4,
            businessName: business.businessName,
            loanAmount: step1.requestedAmount || step1.loanAmount,
            requestedAmount: step1.requestedAmount || step1.loanAmount,
            useOfFunds: step1.useOfFunds || step1.loanPurpose,
            loanPurpose: step1.useOfFunds || step1.loanPurpose
        };
        console.log('✅ Step-based application validated:', {
            requestedAmount: formFields.requestedAmount,
            businessName: business.businessName,
            contactName: `${step4.firstName} ${step4.lastName}`
        });
        // Use default tenant and user IDs for non-authenticated requests
        const defaultTenantId = '00000000-0000-0000-0000-000000000000';
        const defaultUserId = '00000000-0000-0000-0000-000000000001';
        // ✅ DUPLICATE EMAIL CONSTRAINT ELIMINATED: Multiple applications per email allowed
        // Always creates new application and business, reuses existing user by email
        console.log(`✅ MULTIPLE APPLICATIONS ALLOWED: Processing application for email: ${step4.email}`);
        console.log(`✅ Business name: ${step3.businessName} - proceeding with new application creation`);
        // Create or get business record
        let businessRecord;
        // Check if business already exists
        const [existingBusiness] = await db
            .select()
            .from(businesses)
            .where(eq(businesses.businessName, business.businessName || formFields.businessName));
        if (existingBusiness) {
            businessRecord = existingBusiness;
        }
        else {
            // Create new business record
            const [newBusiness] = await db
                .insert(businesses)
                .values({
                id: uuidv4(),
                tenantId: defaultTenantId,
                userId: defaultUserId,
                businessName: (() => {
                    const name = business.businessName || formFields.businessName;
                    if (!name || name.trim().length < 2) {
                        throw new Error(`Business name is required and must be at least 2 characters. Received: ${name}`);
                    }
                    return name.trim();
                })(),
                legalBusinessName: business.legalBusinessName || step3.legalBusinessName || step3.businessName || null,
                businessType: business.businessType || step3.businessType || step3.businessEntity || null,
                industry: business.industry || step3.industry || null,
                yearEstablished: business.yearEstablished || step3.yearEstablished || null,
                ein: business.ein || step3.ein || null,
                address: business.address || step3.businessAddress || {},
                phone: business.phone || step4.phoneNumber || step4.phone || null,
                website: business.website || null,
                description: business.description || null
            })
                .returning();
            businessRecord = newBusiness;
        }
        // Create application record - use client-provided ID if valid UUID, otherwise generate UUID
        let applicationId = clientApplicationId;
        // Validate UUID format if client provided an ID
        if (clientApplicationId && !uuidValidate(clientApplicationId)) {
            console.log(`⚠️ Invalid UUID format provided by client: ${clientApplicationId}, generating new UUID`);
            applicationId = uuidv4();
        }
        else if (!clientApplicationId) {
            applicationId = uuidv4();
        }
        console.log(`📋 ENHANCED: Application ID handling:`, {
            clientProvided: clientApplicationId ? 'YES' : 'NO',
            providedId: clientApplicationId,
            isValidUUID: clientApplicationId ? uuidValidate(clientApplicationId) : 'N/A',
            finalId: applicationId,
            source: (clientApplicationId && uuidValidate(clientApplicationId)) ? 'CLIENT' : 'AUTO_GENERATED',
            requestBody: JSON.stringify(req.body, null, 2)
        });
        console.log(`🔍 ENHANCED: About to insert applicationId into database:`, applicationId);
        // 🚨 CRITICAL DEBUG: Database insertion with comprehensive logging
        console.log('🚨 DEBUG: Application database values before insertion:', {
            id: applicationId,
            tenantId: defaultTenantId,
            userId: defaultUserId,
            businessId: businessRecord.id,
            requestedAmount: formFields.loanAmount || formFields.requestedAmount || step1.requestedAmount || '0',
            useOfFunds: formFields.useOfFunds || formFields.loanPurpose || null,
            numberOfEmployees: business.numberOfEmployees,
            formDataKeys: Object.keys(formFields)
        });
        let newApplication;
        try {
            console.log('🚨 DEBUG: Starting database insertion...');
            newApplication = await db
                .insert(applications)
                .values({
                id: applicationId,
                tenantId: defaultTenantId,
                userId: defaultUserId,
                businessId: businessRecord.id,
                status: 'draft',
                stage: 'New',
                requestedAmount: formFields.loanAmount || formFields.requestedAmount || step1.requestedAmount || '0',
                useOfFunds: formFields.useOfFunds || formFields.loanPurpose || null,
                currentStep: 1,
                formData: {
                    ...formFields,
                    applicationSource: applicationSource,
                    detectedFormat: req.body.step1 ? 'step-based' : 'flat-legacy',
                    timestamp: new Date().toISOString()
                },
                bankingAnalysis: {},
                financialsOCR: {}
            })
                .returning();
            console.log('🚨 DEBUG: Database insertion successful, application ID:', newApplication?.[0]?.id);
        }
        catch (dbError) {
            console.error('🚨 CRITICAL DATABASE ERROR during application creation:', dbError);
            console.error('🚨 DATABASE ERROR DETAILS:', {
                errorMessage: dbError instanceof Error ? dbError.message : String(dbError),
                errorStack: dbError instanceof Error ? dbError.stack : 'No stack trace',
                applicationId: applicationId,
                businessId: businessRecord.id,
                numberOfEmployees: business.numberOfEmployees,
                formFieldsKeys: Object.keys(formFields)
            });
            throw dbError; // Re-throw to be caught by outer try-catch
        }
        const applicationRecord = newApplication?.[0];
        console.log('🚨 DEBUG: Application record extracted:', applicationRecord?.id);
        // Create expected documents based on selected lender product or default requirements
        let documentRequirements = [];
        // Try to get requirements from selected lender product (if productCategory is provided)
        if (formFields.productCategory || applicationRecord.productCategory) {
            try {
                const selectedCategory = formFields.productCategory || applicationRecord.productCategory;
                // Query lender products for document requirements
                const lenderProduct = await db
                    .select()
                    .from(lenderProducts)
                    .where(eq(lenderProducts.category, selectedCategory))
                    .limit(1);
                if (lenderProduct.length > 0 && lenderProduct[0].docRequirements?.length > 0) {
                    documentRequirements = lenderProduct[0].docRequirements;
                    console.log(`📋 Using lender product requirements for ${selectedCategory}:`, documentRequirements);
                }
            }
            catch (error) {
                console.warn('Error fetching lender product requirements:', error);
            }
        }
        // Fall back to default requirements if no specific product requirements found
        if (documentRequirements.length === 0) {
            documentRequirements = DocumentRequirementsService.getDefaultRequirements();
            console.log(`📋 Using default document requirements:`, documentRequirements);
        }
        // Create expected documents records
        if (documentRequirements.length > 0) {
            const expectedDocsData = DocumentRequirementsService.mapRequirementsToExpectedDocuments(applicationRecord.id, documentRequirements);
            try {
                await db.insert(expectedDocuments).values(expectedDocsData);
                console.log(`📋 ENHANCED: Created ${expectedDocsData.length} expected document requirements for application ${applicationRecord.id}`);
            }
            catch (error) {
                console.error('Error creating expected documents:', error);
                // Don't fail the application creation if expected docs creation fails
            }
        }
        console.log(`📋 ENHANCED: Application created with EXACT ID VERIFICATION:`, {
            applicationId: applicationRecord.id,
            businessName: businessRecord.businessName,
            requestedAmount: applicationRecord.requestedAmount,
            status: applicationRecord.status,
            expectedDocuments: documentRequirements.length,
            internalId: applicationRecord.id,
            externalId: `app_prod_${applicationRecord.id}`,
            clientProvidedId: clientApplicationId,
            idMatches: applicationRecord.id === applicationId ? 'YES' : 'NO',
            dbInsertedId: applicationRecord.id,
            requestedId: applicationId
        });
        // STAFF REQUIREMENT 1: Log successful application storage
        console.log("✅ [Staff] Application successfully stored:", applicationRecord.id);
        // STAFF REQUIREMENT 2: Add success entry to timestamped log file
        try {
            fs.appendFileSync("./logs/application_log.txt", `[${new Date().toISOString()}] Application successfully stored: ${applicationRecord.id}\n`);
        }
        catch (logError) {
            console.error("❌ Failed to write success to application log file:", logError);
        }
        // CRITICAL CHECKPOINT: Force a simple database update to prove this code executes
        try {
            console.log('🔴 CRITICAL DEBUG: About to attempt database update for application:', applicationRecord.id);
            console.log('🔴 CRITICAL DEBUG: Database connection exists:', !!db);
            console.log('🔴 CRITICAL DEBUG: Applications table exists:', !!applications);
            const updateResult = await db
                .update(applications)
                .set({
                signUrl: 'CHECKPOINT: Code execution reached end of application creation',
                updatedAt: new Date()
            })
                .where(eq(applications.id, applicationRecord.id));
            console.log('🟢 CRITICAL CHECKPOINT: Post-application creation database update completed');
            console.log('🟢 CRITICAL CHECKPOINT: Update result:', updateResult);
        }
        catch (criticalCheckpointError) {
            console.error('🔴 CRITICAL CHECKPOINT: Post-application database update failed:', criticalCheckpointError);
            console.error('🔴 CRITICAL CHECKPOINT: Error details:', JSON.stringify(criticalCheckpointError, null, 2));
        }
        // 🤖 CRITICAL: CRM CONTACT AUTO-CREATION INTEGRATION
        // Every applicant must automatically appear in staff CRM for follow-up
        try {
            console.log('🤖 [CRM AUTO-CREATE] Starting contact auto-creation for application:', applicationRecord.id);
            // Use the proper CRM service for contact auto-creation
            const { autoCreateContactsFromApplication } = await import('../../services/crmService.js');
            const applicationData = {
                id: applicationRecord.id,
                firstName: step4.firstName,
                lastName: step4.lastName,
                email: step4.email,
                phone: step4.phone,
                businessName: step3.businessName,
                partnerFirstName: step4.partnerFirstName,
                partnerLastName: step4.partnerLastName,
                partnerEmail: step4.partnerEmail,
                partnerPhone: step4.partnerPhone,
                formData: {
                    step3: step3,
                    step4: step4
                }
            };
            await autoCreateContactsFromApplication(applicationData);
            console.log('✅ [CRM AUTO-CREATE] Contact auto-creation completed successfully');
        }
        catch (crmError) {
            console.error('❌ [CRM AUTO-CREATE] Failed to create contact:', crmError);
            // Don't fail application creation if CRM contact creation fails
            console.error('❌ [CRM AUTO-CREATE] Contact creation error, but application creation continues');
        }
        // 📱 AUTOMATIC SMS TRIGGER: Send missing docs SMS for new applications without documents
        console.log("📱 [AUTO-SMS] Triggering immediate automatic SMS for new application");
        try {
            const { sendEnhancedSMS } = await import('../enhancedSmsTemplates.js');
            // Since this is a new application without documents, send the "submission_no_docs" SMS
            console.log(`📱 [AUTO-SMS] Sending missing docs SMS for new application: ${applicationRecord.id}`);
            const smsResult = await sendEnhancedSMS(applicationRecord.id, 'submission_no_docs');
            if (smsResult.success) {
                console.log(`✅ [AUTO-SMS] Automatic SMS sent successfully: ${smsResult.smsId}`);
            }
            else {
                console.error(`❌ [AUTO-SMS] Automatic SMS failed:`, smsResult.error);
            }
        }
        catch (smsError) {
            console.error("❌ [AUTO-SMS] Error sending automatic SMS:", smsError);
            // Don't fail application creation if SMS fails
        }
        // Document signing integration removed - applications use simplified manual review workflow
        const signingUrl = null;
        // No document signing integration - applications proceed directly to manual staff review
        // ✅ MONITOR: Sales Pipeline Integration
        console.log("✅ [MONITOR] Application created successfully - Added to Sales Pipeline");
        console.log("🎯 [MONITOR] Sales Pipeline: Card added to 'New Application' stage");
        res.json({
            success: true,
            applicationId: applicationRecord.id, // raw UUID
            externalId: `app_prod_${applicationRecord.id}`, // optional, for display
            status: applicationRecord.status,
            message: 'Application created successfully',
            version: 'v2025-07-13-deploy',
            timestamp: new Date().toISOString(),
            business: {
                id: businessRecord.id,
                businessName: businessRecord.businessName
            },
            signing_url: signingUrl
        });
    }
    catch (error) {
        // STAFF REQUIREMENT 1: Log application storage failure
        console.error("❌ [Staff] Application storage failed:", error);
        // STAFF REQUIREMENT 2: Add failure entry to timestamped log file
        try {
            fs.appendFileSync("./logs/application_log.txt", `[${new Date().toISOString()}] Application storage failed: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)}\n`);
        }
        catch (logError) {
            console.error("❌ Failed to write failure to application log file:", logError);
        }
        // 🚨 STAFF CRITICAL DEBUG: Comprehensive error handling with detailed information
        console.error('🚨 APPLICATION CREATION FAILED:', error);
        console.error('🚨 ERROR DETAILS:', {
            errorMessage: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
            errorStack: error instanceof Error ? error instanceof Error ? error.stack : undefined : 'No stack trace',
            errorType: typeof error,
            errorName: error instanceof Error ? error.name : 'Unknown',
            timestamp: new Date().toISOString()
        });
        // Log the request data that caused the error
        console.error('🚨 REQUEST DATA THAT CAUSED ERROR:', {
            bodyKeys: Object.keys(req.body),
            hasFormData: !!req.body.formData,
            formDataKeys: req.body.formData ? Object.keys(req.body.formData) : [],
            step1: req.body.step1 || req.body.formData?.step1,
            step3: req.body.step3 || req.body.formData?.step3,
            step4: req.body.step4 || req.body.formData?.step4,
            headers: req.headers
        });
        // Specific error analysis for common issues
        if (error instanceof Error ? error.message : String(error) && error instanceof Error ? error.message : String(error).includes('numberOfEmployees')) {
            console.error('🚨 numberOfEmployees FIELD ERROR DETECTED:', {
                step3NumberOfEmployees: req.body.formData?.step3?.numberOfEmployees,
                step3NumEmployees: req.body.formData?.step3?.numEmployees,
                typeOfNumberOfEmployees: typeof req.body.formData?.step3?.numberOfEmployees,
                typeOfNumEmployees: typeof req.body.formData?.step3?.numEmployees
            });
        }
        // DUPLICATE EMAIL ALLOWED: Check for unique constraint but handle gracefully
        if (error.code === '23505') {
            const userEmail = req.body.step4?.email || req.body.formData?.step4?.email;
            console.log("✅ DUPLICATE EMAIL ALLOWED: Constraint violation handled gracefully for:", userEmail);
            // Continue with the original error handling rather than blocking the application
            console.log("🔄 Proceeding with application creation despite duplicate email constraint");
        }
        if (error instanceof Error ? error.message : String(error) && error instanceof Error ? error.message : String(error).includes('database') || error instanceof Error ? error.message : String(error) && error instanceof Error ? error.message : String(error).includes('constraint')) {
            console.error('🚨 DATABASE CONSTRAINT ERROR DETECTED:', {
                databaseError: true,
                constraintViolation: error instanceof Error ? error.message : String(error).includes('constraint'),
                possibleCause: 'Field type mismatch or missing required field'
            });
        }
        res.status(500).json({
            success: false,
            error: 'Internal Server Error',
            message: 'Application creation failed',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error),
            timestamp: new Date().toISOString(),
            errorType: error instanceof Error ? error.name : 'Unknown'
        });
    }
});
// PATCH /:id - Finalize application submission
router.patch('/:id', async (req, res) => {
    try {
        const rawApplicationId = req.params.id;
        const { formData, status } = req.body;
        // Strip test- prefix for database operations
        const actualId = rawApplicationId.replace(/^test-/, '');
        console.log(`📝 [Application Finalize] Request for: ${rawApplicationId} → ${actualId}`);
        console.log(`📝 [Application Finalize] Update data:`, { formData: !!formData, status });
        // Validate UUID format (after stripping test- prefix)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidValidate(actualId)) {
            console.error(`❌ [Application Finalize] Invalid UUID format: ${actualId}`);
            return res.status(400).json({
                error: 'Invalid application ID format'
            });
        }
        // Verify application exists
        const [application] = await db
            .select()
            .from(applications)
            .where(eq(applications.id, actualId));
        if (!application) {
            console.error(`❌ [Application Finalize] Application not found: ${actualId}`);
            return res.status(404).json({
                error: 'Application not found'
            });
        }
        // Validate current status allows finalization
        const allowedStatuses = ['draft', 'submitted'];
        if (!allowedStatuses.includes(application.status)) {
            console.error(`❌ [Application Finalize] Invalid status: ${application.status}`);
            return res.status(400).json({
                error: 'Application cannot be finalized',
                message: `Application status is '${application.status}', only draft applications can be finalized`,
                currentStatus: application.status
            });
        }
        // Prepare update payload
        const updatePayload = {
            updatedAt: new Date()
        };
        // Update form data if provided
        if (formData) {
            updatePayload.formData = formData;
            console.log(`📝 [Application Finalize] Updating form data`);
        }
        // Update status if provided, default to 'submitted'
        const finalStatus = status || 'submitted';
        updatePayload.status = finalStatus;
        updatePayload.stage = 'In Review';
        if (finalStatus === 'submitted') {
            updatePayload.submittedAt = new Date();
        }
        // Update application
        const [updatedApplication] = await db
            .update(applications)
            .set(updatePayload)
            .where(eq(applications.id, actualId))
            .returning();
        console.log(`✅ [Application Finalize] Successfully updated application ${actualId} to status: ${finalStatus}`);
        // Check if ready for lenders (all required documents uploaded)
        const documentsCount = await db
            .select()
            .from(documents)
            .where(eq(documents.applicationId, actualId));
        const expectedDocsCount = await db
            .select()
            .from(expectedDocuments)
            .where(eq(expectedDocuments.applicationId, actualId));
        const isReadyForLenders = documentsCount.length >= expectedDocsCount.length;
        if (isReadyForLenders && finalStatus === 'submitted') {
            // Update isReadyForLenders flag
            await db
                .update(applications)
                .set({ isReadyForLenders: true })
                .where(eq(applications.id, actualId));
            console.log(`✅ [Application Finalize] Application ready for lenders - all documents uploaded`);
        }
        // Set CORS headers for client portal compatibility
        res.json({
            success: true,
            message: 'Application finalized successfully',
            application: {
                id: updatedApplication.id,
                status: updatedApplication.status,
                stage: updatedApplication.stage,
                updatedAt: updatedApplication.updatedAt,
                submittedAt: updatedApplication.submittedAt,
                isReadyForLenders: isReadyForLenders
            }
        });
    }
    catch (error) {
        console.error(`❌ [Application Finalize] Error:`, error);
        res.status(500).json({
            error: 'Internal server error',
            details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
        });
    }
});
export default router;
// Enhanced debug information
console.log('📋 APPLICATION CREATE ROUTE: Loaded and exported successfully');
console.log('📋 APPLICATION CREATE ROUTE: Configured for POST /');
