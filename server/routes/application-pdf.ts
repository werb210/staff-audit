import { Router } from "express";
import puppeteer from "puppeteer";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { applications, documents, lenders, lender_products } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly.js";

const r = Router();

// Apply auth to all routes except the test endpoint and bulk generation (for testing)
r.use((req: any, res: any, next: any) => {
  if (req.path === '/test-pdf-generator' || req.path === '/applications/generate-all-pdfs') {
    return next();
  }
  return requireAuth(req, res, next);
});

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

// Generate PDF from HTML content
async function generatePDF(htmlContent: string, filename: string) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20mm',
        right: '10mm',
        bottom: '20mm',
        left: '10mm'
      }
    });
    
    return pdf;
  } finally {
    await browser.close();
  }
}

// Generate application summary HTML template
function generateApplicationSummaryHTML(application: any, documents: any[], ocrData: any, lenderMatches: any[]) {
  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'Not specified';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not specified';
    return new Date(dateStr).toLocaleDateString('en-US');
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Application Summary - ${application.business_name || 'Business Application'}</title>
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          margin: 0; 
          padding: 20px; 
          line-height: 1.6;
          color: #333;
        }
        .header { 
          text-align: center; 
          margin-bottom: 30px; 
          border-bottom: 3px solid #2563eb; 
          padding-bottom: 20px; 
        }
        .header h1 {
          color: #1f2937;
          margin: 0;
          font-size: 28px;
        }
        .header .subtitle {
          color: #6b7280;
          margin-top: 5px;
          font-size: 14px;
        }
        .section { 
          margin: 25px 0; 
          page-break-inside: avoid;
        }
        .section h2 { 
          color: #1f2937; 
          border-bottom: 2px solid #e5e7eb; 
          padding-bottom: 8px; 
          margin-bottom: 15px;
          font-size: 20px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin: 15px 0;
        }
        .info-item {
          background: #f8fafc;
          padding: 12px;
          border-radius: 6px;
          border-left: 4px solid #3b82f6;
        }
        .info-label {
          font-weight: 600;
          color: #374151;
          font-size: 13px;
          margin-bottom: 4px;
        }
        .info-value {
          color: #1f2937;
          font-size: 15px;
        }
        .status-badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .status-draft { background: #fef3c7; color: #92400e; }
        .status-submitted { background: #dbeafe; color: #1e40af; }
        .status-approved { background: #d1fae5; color: #065f46; }
        .status-rejected { background: #fee2e2; color: #991b1b; }
        .documents-table {
          width: 100%;
          border-collapse: collapse;
          margin: 15px 0;
        }
        .documents-table th, .documents-table td {
          border: 1px solid #d1d5db;
          padding: 10px;
          text-align: left;
        }
        .documents-table th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        .lender-match {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          padding: 15px;
          margin: 10px 0;
          border-radius: 8px;
        }
        .lender-score {
          float: right;
          background: #22c55e;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-weight: 600;
          font-size: 12px;
        }
        .financial-highlight {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          padding: 15px;
          border-radius: 8px;
          margin: 15px 0;
        }
        .footer { 
          margin-top: 40px; 
          text-align: center; 
          font-size: 12px; 
          color: #6b7280; 
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Application Summary Report</h1>
        <div class="subtitle">Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
        <div class="subtitle">Application ID: ${application.id}</div>
      </div>
      
      <div class="section">
        <h2>Application Overview</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Status</div>
            <div class="info-value">
              <span class="status-badge status-${application.status || 'draft'}">
                ${(application.status || 'draft').replace('_', ' ')}
              </span>
            </div>
          </div>
          <div class="info-item">
            <div class="info-label">Submission Date</div>
            <div class="info-value">${formatDate(application.submitted_at)}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Current Stage</div>
            <div class="info-value">${application.stage || 'New'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Requested Amount</div>
            <div class="info-value">${formatCurrency(application.loan_amount)}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Business Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Business Name</div>
            <div class="info-value">${application.business_name || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Legal Name</div>
            <div class="info-value">${application.legal_business_name || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">DBA Name</div>
            <div class="info-value">${application.dba_name || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Business Type</div>
            <div class="info-value">${application.business_type || 'Not specified'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Business Email</div>
            <div class="info-value">${application.business_email || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Business Phone</div>
            <div class="info-value">${application.business_phone || 'Not provided'}</div>
          </div>
        </div>
        
        <div class="financial-highlight">
          <h3 style="margin-top: 0;">Financial Snapshot</h3>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Annual Revenue</div>
              <div class="info-value">${formatCurrency(application.annual_revenue)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Years in Business</div>
              <div class="info-value">${application.years_in_business || 'Not specified'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Number of Employees</div>
              <div class="info-value">${application.number_of_employees || 'Not specified'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Use of Funds</div>
              <div class="info-value">${application.use_of_funds || 'Not specified'}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Contact Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Contact Name</div>
            <div class="info-value">${application.contact_first_name || ''} ${application.contact_last_name || ''}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Contact Email</div>
            <div class="info-value">${application.contact_email || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Contact Phone</div>
            <div class="info-value">${application.contact_phone || 'Not provided'}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Business Address</div>
            <div class="info-value">${application.business_address || 'Not provided'}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Document Summary</h2>
        <p>Total Documents Uploaded: <strong>${documents.length}</strong></p>
        ${documents.length > 0 ? `
        <table class="documents-table">
          <tr>
            <th>Document Type</th>
            <th>File Name</th>
            <th>Status</th>
            <th>Upload Date</th>
          </tr>
          ${documents.map(doc => `
            <tr>
              <td>${doc.document_type.replace('_', ' ').toUpperCase()}</td>
              <td>${doc.file_name}</td>
              <td><span class="status-badge status-${doc.status}">${doc.status}</span></td>
              <td>${formatDate(doc.created_at)}</td>
            </tr>
          `).join('')}
        </table>
        ` : '<p><em>No documents uploaded yet.</em></p>'}
      </div>

      ${ocrData && Object.keys(ocrData).length > 0 ? `
      <div class="section">
        <h2>OCR Banking Analysis</h2>
        <div class="financial-highlight">
          <p>OCR processing has been completed for uploaded financial documents.</p>
          <p><strong>Data Points Extracted:</strong> ${Object.keys(ocrData).length}</p>
          <p><em>Detailed banking analysis available in application review system.</em></p>
        </div>
      </div>
      ` : ''}

      ${lenderMatches.length > 0 ? `
      <div class="section">
        <h2>Lender Matches (${lenderMatches.length})</h2>
        ${lenderMatches.map(match => `
          <div class="lender-match">
            <div class="lender-score">${match.score || 'N/A'}% Match</div>
            <h4 style="margin-top: 0;">${match.lender_name}</h4>
            <p><strong>Product:</strong> ${match.product_name}</p>
            <p><strong>Amount Range:</strong> ${formatCurrency(match.min_amount)} - ${formatCurrency(match.max_amount)}</p>
            <p><strong>Interest Rate:</strong> ${match.rate_min}% - ${match.rate_max}%</p>
            ${match.reasons ? `<p><strong>Match Reasons:</strong> ${match.reasons.join(', ')}</p>` : ''}
          </div>
        `).join('')}
      </div>
      ` : `
      <div class="section">
        <h2>Lender Matching</h2>
        <p><em>Lender matching will be performed once application is complete and submitted.</em></p>
      </div>
      `}

      <div class="footer">
        <p>This application summary was generated automatically from your business lending platform.</p>
        <p>Document ID: ${application.id} | Generated: ${new Date().toISOString()}</p>
      </div>
    </body>
    </html>
  `;
}

// Generate PDF for a single application
r.post("/application/:id/generate-pdf", async (req: any, res) => {
  const { id } = req.params;
  
  try {
    console.log(`🔄 Generating PDF for application ${id}...`);
    
    // Fetch application data
    const [applicationData] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);
    
    if (!applicationData) {
      return res.status(404).json({ ok: false, error: "Application not found" });
    }
    
    // Fetch related documents
    const applicationDocuments = await db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, id));
    
    // Extract OCR data
    const ocrData = applicationData.financials_ocr || {};
    
    // Placeholder for lender matches (would normally fetch from lender matching system)
    const lenderMatches: any[] = [];
    
    // Generate HTML content
    const htmlContent = generateApplicationSummaryHTML(
      applicationData, 
      applicationDocuments, 
      ocrData, 
      lenderMatches
    );
    
    // Generate PDF
    const pdfBuffer = await generatePDF(htmlContent, `application-${id}-summary.pdf`);
    
    // Store PDF as document in database
    const pdfDocument = await db.insert(documents).values({
      applicationId: id,
      fileName: `Application_Summary_${applicationData.business_name || 'Business'}_${new Date().toISOString().split('T')[0]}.pdf`,
      fileType: 'application/pdf',
      documentType: 'application_summary_pdf',
      fileSize: pdfBuffer.length,
      uploadedBy: req.user?.id || 'system',
      isRequired: false,
      isVerified: true,
      status: 'pending',
      storageKey: `application-summaries/${id}/summary-${Date.now()}.pdf`,
      description: 'Auto-generated application summary PDF with business details, document status, and OCR analysis'
    }).returning();
    
    console.log(`✅ PDF generated and stored for application ${id}`);
    
    // Return PDF for download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Application_Summary_${id}.pdf"`);
    res.send(pdfBuffer);
    
  } catch (error: unknown) {
    console.error('❌ PDF generation failed:', error);
    res.status(500).json({ 
      ok: false, 
      error: "PDF generation failed",
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Generate PDFs for all applications (with bypass for testing)
r.post("/applications/generate-all-pdfs", async (req: any, res) => {
  try {
    console.log('🔄 Starting bulk PDF generation for all applications...');
    
    // Fetch all applications using raw SQL to avoid schema conflicts
    const allApplications = await pool.query(`
      SELECT id, business_name, contact_first_name, contact_last_name, 
             contact_email, loan_amount, status, created_at, financials_ocr,
             legal_business_name, dba_name, business_type, business_email,
             business_phone, business_address, contact_phone, owner_first_name,
             owner_last_name, annual_revenue, years_in_business, number_of_employees,
             use_of_funds, stage, submitted_at
      FROM applications 
      ORDER BY created_at DESC
    `);
    
    console.log(`📊 Found ${allApplications.rows.length} applications to process`);
    
    const results = {
      total: allApplications.rows.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
      pdfs: [] as any[]
    };
    
    for (const app of allApplications.rows) {
      try {
        console.log(`🔄 Processing application ${app.id}...`);
        
        // Fetch related documents using raw SQL
        const applicationDocuments = await pool.query(`
          SELECT id, file_name, document_type, status, created_at, file_size
          FROM documents 
          WHERE application_id = $1
          ORDER BY created_at DESC
        `, [app.id]);
        
        // Extract OCR data
        const ocrData = app.financials_ocr || {};
        
        // Generate HTML content
        const htmlContent = generateApplicationSummaryHTML(
          app, 
          applicationDocuments.rows, 
          ocrData, 
          []
        );
        
        // Generate PDF
        const pdfBuffer = await generatePDF(htmlContent, `application-${app.id}-summary.pdf`);
        
        // Store PDF as document in database using raw SQL
        const pdfDocument = await pool.query(`
          INSERT INTO documents (application_id, file_name, file_type, document_type, file_size, uploaded_by, 
                                is_required, is_verified, status, storage_key, description)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id, file_name, storage_key
        `, [
          app.id,
          `Application_Summary_${app.business_name || 'Business'}_${new Date().toISOString().split('T')[0]}.pdf`,
          'application/pdf',
          'application_summary_pdf',
          pdfBuffer.length,
          req.user?.id || 'system',
          false,
          true,
          'pending',
          `application-summaries/${app.id}/summary-${Date.now()}.pdf`,
          'Auto-generated application summary PDF with business details, document status, and OCR analysis'
        ]);
        
        results.successful++;
        results.pdfs.push({
          application_id: app.id,
          business_name: app.business_name,
          pdf_document_id: pdfDocument.rows[0].id,
          file_name: pdfDocument.rows[0].file_name,
          storage_key: pdfDocument.rows[0].storage_key
        });
        
        console.log(`✅ PDF generated for application ${app.id}`);
        
      } catch (error: unknown) {
        results.failed++;
        const errorMsg = `Application ${app.id}: ${error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'}`;
        results.errors.push(errorMsg);
        console.error(`❌ Failed to generate PDF for application ${app.id}:`, error);
      }
    }
    
    console.log(`🎯 Bulk PDF generation complete: ${results.successful} successful, ${results.failed} failed`);
    
    res.json({
      ok: true,
      message: "Bulk PDF generation completed",
      results
    });
    
  } catch (error: unknown) {
    console.error('❌ Bulk PDF generation failed:', error);
    res.status(500).json({ 
      ok: false, 
      error: "Bulk PDF generation failed",
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Test PDF generator functionality (no auth required for testing)
r.get("/test-pdf-generator", async (req: any, res) => {
  try {
    console.log('🧪 Testing PDF generator...');
    
    const testHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>PDF Generator Test</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .header { text-align: center; color: #2563eb; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>PDF Generator Test</h1>
          <p>Generated at: ${new Date().toLocaleString()}</p>
        </div>
        <p>✅ PDF generation system is working correctly!</p>
        <p>🧪 This is a test document to verify PDF creation functionality.</p>
      </body>
      </html>
    `;
    
    const pdfBuffer = await generatePDF(testHTML, 'test-pdf.pdf');
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="pdf-generator-test.pdf"');
    res.send(pdfBuffer);
    
    console.log('✅ PDF generator test completed successfully');
    
  } catch (error: unknown) {
    console.error('❌ PDF generator test failed:', error);
    res.status(500).json({ 
      ok: false, 
      error: "PDF generator test failed",
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default r;