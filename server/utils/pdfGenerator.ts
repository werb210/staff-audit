/**
 * PDF Generator for Signed Applications
 * Generates PDF documents for completed loan applications
 */

import { jsPDF } from 'jspdf';
import { db } from '../db.js';
import { applications, businesses, documents } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';

interface ApplicationData {
  id: string;
  business_name: string;
  requested_amount: number;
  use_of_funds: string;
  status: string;
  created_at: Date;
  documents: Array<{
    id: string;
    file_name: string;
    document_type: string;
    file_size: number;
  }>;
}

export async function generateSignedApplicationPDF(applicationId: string): Promise<string> {
  try {
    console.log(`🔧 [PDF GENERATOR] Starting PDF generation for application: ${applicationId}`);
    
    // Fetch application data
    const applicationResults = await db
      .select({
        id: applications.id,
        business_name: businesses.businessName,
        requested_amount: applications.requested_amount,
        use_of_funds: applications.use_of_funds,
        status: applications.status,
        created_at: applications.createdAt
      })
      .from(applications)
      .leftJoin(businesses, eq(applications.business_id, businesses.id))
      .where(eq(applications.id, applicationId));

    if (applicationResults.length === 0) {
      throw new Error(`Application ${applicationId} not found`);
    }

    const application = applicationResults[0];
    
    // Fetch documents
    const applicationDocuments = await db
      .select({
        id: documents.id,  
        file_name: documents.fileName,
        document_type: documents.documentType,
        file_size: documents.fileSize
      })
      .from(documents)
      .where(eq(documents.applicationId, applicationId));

    console.log(`📄 [PDF GENERATOR] Found ${applicationDocuments.length} documents for application`);

    // Create PDF
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('SIGNED LOAN APPLICATION', 20, 30);
    
    // Application Details
    doc.setFontSize(12);
    doc.text(`Application ID: ${application.id}`, 20, 50);
    doc.text(`Business Name: ${application.businessName || 'N/A'}`, 20, 60);
    doc.text(`Requested Amount: $${application.requested_amount?.toLocaleString() || 'N/A'}`, 20, 70);
    doc.text(`Use of Funds: ${application.use_of_funds || 'N/A'}`, 20, 80);
    doc.text(`Status: ${application.status}`, 20, 90);
    doc.text(`Submitted: ${application.createdAt?.toLocaleDateString() || 'N/A'}`, 20, 100);
    
    // Documents Section
    doc.text('SUBMITTED DOCUMENTS:', 20, 120);
    
    let yPos = 130;
    if (applicationDocuments.length > 0) {
      applicationDocuments.forEach((doc_item, index) => {
        doc.text(`${index + 1}. ${doc_item.fileName} (${doc_item.documentType})`, 25, yPos);
        doc.text(`   Size: ${(doc_item.fileSize / 1024).toFixed(1)} KB`, 25, yPos + 8);
        yPos += 18;
      });
    } else {
      doc.text('No documents found', 25, yPos);
    }
    
    // Signature Section
    yPos += 20;
    doc.text('APPLICANT CONFIRMATION:', 20, yPos);
    doc.text('By submitting this application, I confirm that all information', 20, yPos + 10);
    doc.text('provided is accurate and complete.', 20, yPos + 20);
    
    yPos += 40;
    doc.text('Digital Signature: ________________________', 20, yPos);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPos + 15);
    
    // Generate PDF buffer
    const pdfBuffer = doc.output('arraybuffer');
    
    // Save PDF to file system
    const fs = await import('fs');
    const path = await import('path');
    
    const pdfFileName = `signed_application_${applicationId}.pdf`;
    const pdfPath = path.join(process.cwd(), 'uploads', 'documents', pdfFileName);
    
    // Ensure directory exists
    const uploadsDir = path.dirname(pdfPath);
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Write PDF file
    fs.writeFileSync(pdfPath, Buffer.from(pdfBuffer));
    
    // Save PDF to database as document
    const pdfDocumentResult = await db
      .insert(documents)
      .values({
        application_id: applicationId,
        file_name: pdfFileName,
        file_path: pdfPath,
        file_size: pdfBuffer.byteLength,
        document_type: 'signed_application',
        uploaded_by: 'system_pdf_generator',
        status: 'pending'
      })
      .returning({ id: documents.id });

    const pdfDocumentId = pdfDocumentResult[0].id;
    
    console.log(`✅ [PDF GENERATOR] PDF generated successfully: ${pdfFileName}`);
    console.log(`📄 [PDF GENERATOR] PDF saved to database with ID: ${pdfDocumentId}`);
    console.log(`📁 [PDF GENERATOR] PDF file path: ${pdfPath}`);
    
    return pdfDocumentId;
    
  } catch (error: unknown) {
    console.error(`❌ [PDF GENERATOR] Error generating PDF for ${applicationId}:`, error);
    throw error;
  }
}

export async function generatePDFForApplication(applicationId: string): Promise<{ success: boolean; documentId?: string; error?: string }> {
  try {
    const documentId = await generateSignedApplicationPDF(applicationId);
    return { success: true, documentId };
  } catch (error: unknown) {
    return { 
      success: false, 
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error' 
    };
  }
}

export async function regenerateSignedApplicationPDF(applicationId: string): Promise<string> {
  // First remove any existing signed application PDF
  const { db } = await import('../db.js');
  const { documents } = await import('../../shared/schema.js');
  const { eq, and } = await import('drizzle-orm');
  
  await db.delete(documents).where(
    and(
      eq(documents.applicationId, applicationId),
      eq(documents.documentType, 'signed_application')
    )
  );
  
  // Generate new PDF
  return await generateSignedApplicationPDF(applicationId);
}

export async function hasSignedApplicationPDF(applicationId: string): Promise<boolean> {
  const { db } = await import('../db.js');
  const { documents } = await import('../../shared/schema.js');
  const { eq, and } = await import('drizzle-orm');
  
  const existingPdf = await db.select()
    .from(documents)
    .where(
      and(
        eq(documents.applicationId, applicationId),
        eq(documents.documentType, 'signed_application')
      )
    )
    .limit(1);
    
  return existingPdf.length > 0;
}