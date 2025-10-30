import { PDFDocument, PDFForm, PDFTextField } from 'pdf-lib';
import { uploadDocumentToS3 } from '../utils/s3Upload';
import { db } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { buildPdfData } from './_canonFields';

export async function generateSignedApplicationPdf(applicationId: string) {
  try {
    console.log(`📄 [PDF] Generating signed application PDF for: ${applicationId}`);
    
    // 1. Fetch application data using raw SQL (avoiding schema issues)
    const applicationQuery = await db.execute(
      `SELECT a.*, b.business_name, b.legal_business_name, b.business_type,
              u.first_name, u.last_name, u.email, u.phone
       FROM applications a
       LEFT JOIN businesses b ON a.businessId = b.id
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.id = $1`,
      [applicationId]
    );

    if (!applicationQuery || applicationQuery.length === 0) {
      throw new Error("Application not found");
    }

    const application = applicationQuery[0] as any;
    const data = buildPdfData(application);

    console.log(`✅ [PDF] Application data retrieved for: ${data.businessName || 'Unknown Business'}`);

    // 2. Create a simple PDF document (since we don't have a template)
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Standard letter size
    const { width, height } = page.getSize();
    
    // Add content to the PDF
    const fontSize = 12;
    const titleFontSize = 16;
    let yPosition = height - 50;

    // Title
    page.drawText('LOAN APPLICATION - SIGNED COPY', {
      x: 50,
      y: yPosition,
      size: titleFontSize,
    });
    yPosition -= 40;

    // Business Information
    page.drawText('BUSINESS INFORMATION', {
      x: 50,
      y: yPosition,
      size: 14,
    });
    yPosition -= 25;

    const businessName = data.businessName || 'Not provided';
    const businessType = data.industry || 'Not provided';
    const requestedAmount = data.requested || 'Not provided';
    const useOfFunds = data.useOfFunds || 'Not provided';

    page.drawText(`Business Name: ${businessName}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 20;

    page.drawText(`Business Type: ${businessType}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 20;

    page.drawText(`Requested Amount: $${requestedAmount}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 20;

    page.drawText(`Use of Funds: ${useOfFunds}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 40;

    // Contact Information
    page.drawText('CONTACT INFORMATION', {
      x: 50,
      y: yPosition,
      size: 14,
    });
    yPosition -= 25;

    const contactName = `${data.contact.firstName || ''} ${data.contact.lastName || ''}`.trim() || 'Not provided';
    const contactEmail = data.contact.email || 'Not provided';
    const contactPhone = data.contact.phone || 'Not provided';

    page.drawText(`Contact Name: ${contactName}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 20;

    page.drawText(`Email: ${contactEmail}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 20;

    page.drawText(`Phone: ${contactPhone}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 40;

    // Application Details
    page.drawText('APPLICATION DETAILS', {
      x: 50,
      y: yPosition,
      size: 14,
    });
    yPosition -= 25;

    page.drawText(`Application ID: ${applicationId}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 20;

    page.drawText(`Status: ${application.status || 'Submitted'}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 20;

    page.drawText(`Submission Date: ${new Date(application.createdAt).toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 40;

    // Signature section
    page.drawText('ELECTRONIC SIGNATURE', {
      x: 50,
      y: yPosition,
      size: 14,
    });
    yPosition -= 25;

    page.drawText('By submitting this application electronically, I certify that all information', {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 15;

    page.drawText('provided is true and accurate to the best of my knowledge.', {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 30;

    page.drawText(`Electronically signed by: ${contactName}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });
    yPosition -= 15;

    page.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: 50,
      y: yPosition,
      size: fontSize,
    });

    // 3. Generate PDF bytes
    const pdfBytes = await pdfDoc.save();
    const buffer = Buffer.from(pdfBytes);

    console.log(`✅ [PDF] PDF document generated (${buffer.length} bytes)`);

    // 4. Upload to S3
    const storageKey = await uploadDocumentToS3(applicationId, buffer, {
      documentType: "signed_application",
      fileName: "Signed_Application.pdf",
    });

    console.log(`✅ [MONITOR] Final PDF uploaded - signed_application`);
    console.log(`✅ [MONITOR] S3 Key: ${storageKey}`);

    // 5. Save to database
    const documentId = uuidv4();
    await db.execute(
      `INSERT INTO documents (
        id, applicationId, name, document_type, status, 
        source, uploaded_by, storage_key, uploaded_at, size, checksum
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        documentId,
        applicationId,
        "Signed_Application.pdf",
        "signed_application",
        "accepted",
        "system-generated",
        "system",
        storageKey,
        new Date().toISOString(),
        buffer.length,
        `sha256_${Date.now()}` // Simple checksum placeholder
      ]
    );

    console.log(`✅ [PDF] Document record saved: ${documentId}`);

    return { 
      success: true, 
      documentId,
      storageKey,
      fileName: "Signed_Application.pdf"
    };

  } catch (error) {
    console.error('❌ [PDF] Generation error:', error);
    throw error;
  }
}