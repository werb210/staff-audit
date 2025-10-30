/**
 * Comprehensive PDF Generator Service
 * Handles application PDF generation and batch processing
 */
import { PDFDocument, rgb } from 'pdf-lib';
import { db } from '../db';
import { applications, documents, contacts } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { uploadDocumentToS3 } from '../utils/s3Upload';
/**
 * Generate comprehensive PDF for a single application
 */
export async function generateApplicationPDF(applicationId) {
    console.log(`📝 [PDF-GEN] Starting PDF generation for application: ${applicationId}`);
    try {
        // Fetch application data with contact info and canon data
        const [appResult] = await db
            .select({
            id: applications.id,
            businessName: applications.businessName,
            requestedAmount: applications.requestedAmount,
            useOfFunds: applications.useOfFunds,
            businessEmail: applications.businessEmail,
            businessPhone: applications.businessPhone,
            submittedAt: applications.submittedAt,
            industry: applications.industry,
            revenueRange: applications.revenueRange,
            yearsInBusiness: applications.yearsInBusiness,
            contactName: contacts.firstName,
            contactLastName: contacts.lastName,
            contactEmail: contacts.email,
            contactPhone: contacts.phone,
            // Canon data for lossless field access
            applicationCanon: applications.application_canon,
            applicationCanonVersion: applications.application_canon_version,
            applicationFieldCount: applications.application_field_count,
        })
            .from(applications)
            .leftJoin(contacts, eq(applications.contactId, contacts.id))
            .where(eq(applications.id, applicationId));
        if (!appResult) {
            throw new Error(`Application not found: ${applicationId}`);
        }
        // Extract canon data for enhanced field access
        const canon = appResult.applicationCanon ?? {};
        const hasCanon = Object.keys(canon).length > 0;
        console.log(`📊 [PDF-GEN] Canon data available: ${hasCanon}, fields: ${appResult.applicationFieldCount ?? 0}`);
        // Prefer canon data when available, fallback to column data
        const pdfData = {
            businessName: canon.headquarters ?? canon.businessName ?? appResult.businessName,
            requestedAmount: canon.fundingAmount ?? appResult.requestedAmount,
            useOfFunds: canon.fundsPurpose ?? appResult.useOfFunds,
            industry: canon.industry ?? appResult.industry,
            revenueRange: appResult.revenueRange,
            yearsInBusiness: appResult.yearsInBusiness,
            // Enhanced fields from canon
            businessLocation: canon.businessLocation,
            headquartersState: canon.headquartersState,
            salesHistory: canon.salesHistory,
            revenueLastYear: canon.revenueLastYear,
            averageMonthlyRevenue: canon.averageMonthlyRevenue,
            accountsReceivableBalance: canon.accountsReceivableBalance,
            fixedAssetsValue: canon.fixedAssetsValue,
            equipmentValue: canon.equipmentValue,
            selectedCategory: canon.selectedCategory,
        };
        // Create PDF document
        const pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([612, 792]); // Letter size
        const { width, height } = page.getSize();
        // Set up fonts and colors
        const fontSize = 12;
        const headerFontSize = 16;
        const titleFontSize = 20;
        const margin = 50;
        // Header
        page.drawText('APPLICATION SUMMARY', {
            x: margin,
            y: height - margin,
            size: titleFontSize,
            color: rgb(0, 0.3, 0.6)
        });
        page.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
            x: width - margin - 150,
            y: height - margin,
            size: 10,
            color: rgb(0.5, 0.5, 0.5)
        });
        let yPosition = height - margin - 40;
        // Application Information
        page.drawText('APPLICATION DETAILS', {
            x: margin,
            y: yPosition,
            size: headerFontSize,
            color: rgb(0, 0.3, 0.6)
        });
        yPosition -= 30;
        // Enhanced fields using canon data when available
        const fields = [
            { label: 'Application ID:', value: appResult.id },
            { label: 'Business Name:', value: pdfData.businessName || 'N/A' },
            { label: 'Requested Amount:', value: pdfData.requestedAmount ? `$${pdfData.requestedAmount}` : 'N/A' },
            { label: 'Use of Funds:', value: pdfData.useOfFunds || 'N/A' },
            { label: 'Industry:', value: pdfData.industry || 'N/A' },
            { label: 'Business Location:', value: pdfData.businessLocation || 'N/A' },
            { label: 'Headquarters State:', value: pdfData.headquartersState || 'N/A' },
            { label: 'Revenue Range:', value: pdfData.revenueRange || 'N/A' },
            { label: 'Revenue Last Year:', value: pdfData.revenueLastYear ? `$${pdfData.revenueLastYear}` : 'N/A' },
            { label: 'Avg Monthly Revenue:', value: pdfData.averageMonthlyRevenue ? `$${pdfData.averageMonthlyRevenue}` : 'N/A' },
            { label: 'Years in Business:', value: pdfData.yearsInBusiness?.toString() || 'N/A' },
            { label: 'Category:', value: pdfData.selectedCategory || 'N/A' },
            { label: 'Submitted:', value: appResult.submittedAt ? new Date(appResult.submittedAt).toLocaleDateString() : 'N/A' }
        ];
        fields.forEach(field => {
            page.drawText(field.label, {
                x: margin,
                y: yPosition,
                size: fontSize,
                color: rgb(0.3, 0.3, 0.3)
            });
            page.drawText(field.value, {
                x: margin + 120,
                y: yPosition,
                size: fontSize,
                color: rgb(0, 0, 0)
            });
            yPosition -= 20;
        });
        yPosition -= 20;
        // Contact Information
        page.drawText('CONTACT INFORMATION', {
            x: margin,
            y: yPosition,
            size: headerFontSize,
            color: rgb(0, 0.3, 0.6)
        });
        yPosition -= 30;
        const contactFields = [
            { label: 'Contact Name:', value: `${appResult.contactName || ''} ${appResult.contactLastName || ''}`.trim() || 'N/A' },
            { label: 'Email:', value: appResult.contactEmail || 'N/A' },
            { label: 'Phone:', value: appResult.contactPhone || 'N/A' },
            { label: 'Business Email:', value: appResult.businessEmail || 'N/A' },
            { label: 'Business Phone:', value: appResult.businessPhone || 'N/A' }
        ];
        contactFields.forEach(field => {
            page.drawText(field.label, {
                x: margin,
                y: yPosition,
                size: fontSize,
                color: rgb(0.3, 0.3, 0.3)
            });
            page.drawText(field.value, {
                x: margin + 120,
                y: yPosition,
                size: fontSize,
                color: rgb(0, 0, 0)
            });
            yPosition -= 20;
        });
        // Footer
        page.drawText('Boreal Financial - Confidential', {
            x: margin,
            y: 30,
            size: 10,
            color: rgb(0.5, 0.5, 0.5)
        });
        // Serialize the PDF
        const pdfBytes = await pdfDoc.save();
        console.log(`✅ [PDF-GEN] PDF generated successfully for application: ${applicationId}`);
        return Buffer.from(pdfBytes);
    }
    catch (error) {
        console.error(`❌ [PDF-GEN] Failed to generate PDF for application ${applicationId}:`, error);
        throw error;
    }
}
/**
 * Save generated PDF as document to S3 and database
 */
export async function saveDocumentToS3AndDB(applicationId, fileBuffer, filename, category = 'generated_application_summary', status = 'accepted') {
    console.log(`📤 [PDF-GEN] Uploading PDF to S3: ${filename}`);
    try {
        // Upload to S3
        const s3Result = await uploadDocumentToS3({
            buffer: fileBuffer,
            originalName: filename,
            mimeType: 'application/pdf'
        });
        // Save document record to database
        const [document] = await db.insert(documents).values({
            applicationId,
            originalFilename: filename,
            s3Key: s3Result.key,
            s3Bucket: s3Result.bucket,
            documentType: category,
            status: status,
            fileSize: fileBuffer.length,
            mimeType: 'application/pdf',
            uploadedAt: new Date(),
            metadata: {
                generated: true,
                generatedAt: new Date().toISOString(),
                category: 'Application Summary'
            }
        }).returning({ id: documents.id });
        console.log(`✅ [PDF-GEN] Document saved to database with ID: ${document.id}`);
        return document.id;
    }
    catch (error) {
        console.error(`❌ [PDF-GEN] Failed to save document:`, error);
        throw error;
    }
}
/**
 * Generate PDFs for all applications in bulk
 */
export async function generateAllApplicationPDFs() {
    console.log(`🔄 [PDF-GEN] Starting bulk PDF generation for all applications`);
    try {
        // Get all applications
        const apps = await db.select()
            .from(applications);
        console.log(`📊 [PDF-GEN] Found ${apps.length} applications to process`);
        const results = {
            total: apps.length,
            successful: 0,
            failed: 0,
            errors: []
        };
        // Process each application
        for (const app of apps) {
            try {
                console.log(`🔄 [PDF-GEN] Processing application: ${app.id} (${app.businessName || 'No business name'})`);
                // Generate PDF
                const pdfBuffer = await generateApplicationPDF(app.id);
                // Save to S3 and database
                const filename = `ApplicationSummary-${app.id}.pdf`;
                await saveDocumentToS3AndDB(app.id, pdfBuffer, filename, 'generated_application_summary', 'accepted');
                results.successful++;
                console.log(`✅ [PDF-GEN] Successfully processed application: ${app.id}`);
            }
            catch (error) {
                console.error(`❌ [PDF-GEN] Failed to process application ${app.id}:`, error);
                results.failed++;
                results.errors.push({
                    applicationId: app.id,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        console.log(`🎯 [PDF-GEN] Bulk generation complete:`, results);
        return results;
    }
    catch (error) {
        console.error(`❌ [PDF-GEN] Bulk generation failed:`, error);
        throw error;
    }
}
/**
 * Test PDF generation for a single application
 */
export async function testPDFGeneration(applicationId) {
    console.log(`🧪 [PDF-GEN] Running PDF generation test`);
    try {
        // If no application ID provided, get the first one
        if (!applicationId) {
            const [app] = await db.select({ id: applications.id })
                .from(applications)
                .limit(1);
            if (!app) {
                throw new Error('No applications found in database');
            }
            applicationId = app.id;
        }
        console.log(`🧪 [PDF-GEN] Testing with application: ${applicationId}`);
        // Generate PDF
        const pdfBuffer = await generateApplicationPDF(applicationId);
        // Save to S3 and database
        const filename = `Test-ApplicationSummary-${applicationId}.pdf`;
        const documentId = await saveDocumentToS3AndDB(applicationId, pdfBuffer, filename, 'test_generated_summary', 'accepted');
        return {
            success: true,
            applicationId,
            filename,
            fileSize: pdfBuffer.length,
            s3Key: documentId
        };
    }
    catch (error) {
        console.error(`❌ [PDF-GEN] Test failed:`, error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}
