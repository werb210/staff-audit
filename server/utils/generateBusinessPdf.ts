import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { pool } from '../db.js';

/**
 * Generate authentic business PDF based on document type and extracted data
 */
export async function generateBusinessPdf(documentData: any, applicationData: any): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // Standard Letter size
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Header
  page.drawText('RECREATED DOCUMENT', {
    x: 50,
    y: 750,
    size: 16,
    font: boldFont,
    color: rgb(0.8, 0, 0) // Red header
  });

  page.drawText(`Original: ${documentData.fileName}`, {
    x: 50,
    y: 720,
    size: 12,
    font: font
  });

  page.drawText(`Document Type: ${documentData.documentType}`, {
    x: 50,
    y: 700,
    size: 12,
    font: font
  });

  page.drawText(`Generated: ${new Date().toLocaleString()}`, {
    x: 50,
    y: 680,
    size: 12,
    font: font
  });

  // Business Information Section
  let yPosition = 640;
  
  if (applicationData) {
    page.drawText('BUSINESS INFORMATION', {
      x: 50,
      y: yPosition,
      size: 14,
      font: boldFont
    });

    yPosition -= 30;

    const businessFields = [
      ['Business Name:', applicationData.legal_business_name || 'N/A'],
      ['Contact Name:', `${applicationData.contact_first_name || ''} ${applicationData.contact_last_name || ''}`.trim()],
      ['Email:', applicationData.contact_email || 'N/A'],
      ['Phone:', applicationData.contact_phone || 'N/A'],
      ['Business Type:', applicationData.business_entity_type || 'N/A'],
      ['Requested Amount:', applicationData.requested_amount ? `$${applicationData.requested_amount.toLocaleString()}` : 'N/A'],
      ['Use of Funds:', applicationData.use_of_funds || 'N/A']
    ];

    businessFields.forEach(([label, value]) => {
      if (value && value !== 'N/A') {
        page.drawText(label, {
          x: 50,
          y: yPosition,
          size: 11,
          font: boldFont
        });

        page.drawText(value, {
          x: 200,
          y: yPosition,
          size: 11,
          font: font
        });

        yPosition -= 25;
      }
    });
  }

  // Document-specific content based on type
  yPosition -= 20;
  
  switch (documentData.documentType) {
    case 'bank_statements':
      page.drawText('BANK STATEMENT INFORMATION', {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont
      });
      yPosition -= 30;
      page.drawText('• This document contained banking transaction history', { x: 70, y: yPosition, size: 11, font: font });
      yPosition -= 20;
      page.drawText('• Account balances and cash flow data were included', { x: 70, y: yPosition, size: 11, font: font });
      break;

    case 'profit_loss_statement':
      page.drawText('PROFIT & LOSS STATEMENT', {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont
      });
      yPosition -= 30;
      page.drawText('• Revenue and expense breakdown', { x: 70, y: yPosition, size: 11, font: font });
      yPosition -= 20;
      page.drawText('• Net income calculation', { x: 70, y: yPosition, size: 11, font: font });
      break;

    case 'balance_sheet':
      page.drawText('BALANCE SHEET', {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont
      });
      yPosition -= 30;
      page.drawText('• Assets and liabilities summary', { x: 70, y: yPosition, size: 11, font: font });
      yPosition -= 20;
      page.drawText('• Equity position details', { x: 70, y: yPosition, size: 11, font: font });
      break;

    default:
      page.drawText('DOCUMENT CONTENTS', {
        x: 50,
        y: yPosition,
        size: 14,
        font: boldFont
      });
      yPosition -= 30;
      page.drawText('• Original document data was processed', { x: 70, y: yPosition, size: 11, font: font });
      yPosition -= 20;
      page.drawText('• Financial information extracted for analysis', { x: 70, y: yPosition, size: 11, font: font });
  }

  // Footer notice
  page.drawText('This document was automatically regenerated from stored application data.', {
    x: 50,
    y: 50,
    size: 10,
    font: font,
    color: rgb(0.5, 0.5, 0.5)
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Get application data for PDF generation
 */
export async function getApplicationDataForPdf(applicationId: string): Promise<any> {
  try {
    const result = await pool.query(`
      SELECT legal_business_name, 
             contact_first_name, 
             contact_last_name,
             contact_email, 
             contact_phone, 
             business_entity_type, 
             requested_amount, 
             use_of_funds
      FROM applications 
      WHERE id = $1
    `, [applicationId]);
    
    return result.rows[0] || null;
  } catch (error: unknown) {
    console.error('❌ [PDF GENERATION] Failed to get application data:', error);
    return null;
  }
}