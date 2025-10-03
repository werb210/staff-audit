import { Router } from "express";
import { Client } from "pg";
import { documentBuilder } from "../services/documentBuilder.js";

const router = Router();

async function pgc() {
  const c = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  return c;
}

// GET /:id/required-documents - Get required documents for application
router.get("/:id/required-documents", async (req, res) => {
  const client = await pgc();
  try {
    const { id } = req.params;
    
    // Fetch application data
    const query = `
      SELECT id, requested_amount, form_data, product_id, submission_country
      FROM applications 
      WHERE id = $1
    `;
    
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    const appRow = result.rows[0];
    const formData = appRow.form_data || {};
    
    // Build application object for document builder
    const app = {
      id: appRow.id,
      amount: appRow.requested_amount || formData.amount || 0,
      country: appRow.submission_country || formData.country || 'US',
      timeInBusinessMonths: formData.timeInBusinessMonths || 12,
      monthlyRevenue: formData.monthlyRevenue || 0,
      industry: formData.industry || 'Other',
      product_id: appRow.product_id || formData.product_id
    };
    
    // Get dynamic document requirements
    const documents = await documentBuilder(app);
    
    // Check which documents have already been uploaded
    const uploadedQuery = `
      SELECT document_type, COUNT(*) as count
      FROM documents 
      WHERE application_id = $1 
      GROUP BY document_type
    `;
    
    const uploadedResult = await client.query(uploadedQuery, [id]);
    const uploadedDocs = uploadedResult.rows.reduce((acc, row) => {
      acc[row.document_type] = parseInt(row.count);
      return acc;
    }, {} as { [key: string]: number });
    
    // Enhance documents with upload status
    const enhancedDocuments = documents.map(doc => ({
      ...doc,
      uploaded: uploadedDocs[doc.document_type] || 0,
      status: (uploadedDocs[doc.document_type] || 0) > 0 ? 'uploaded' : 'pending'
    }));
    
    // Calculate completion statistics
    const requiredDocs = enhancedDocuments.filter(d => d.required);
    const uploadedRequiredDocs = requiredDocs.filter(d => d.uploaded > 0);
    const completionPercentage = requiredDocs.length > 0 
      ? Math.round((uploadedRequiredDocs.length / requiredDocs.length) * 100) 
      : 0;
    
    // Group documents by step for easier client handling
    const documentsByStep = enhancedDocuments.reduce((acc, doc) => {
      if (!acc[doc.step]) {
        acc[doc.step] = [];
      }
      acc[doc.step].push(doc);
      return acc;
    }, {} as { [step: number]: any[] });
    
    res.json({
      applicationId: id,
      totalDocuments: enhancedDocuments.length,
      requiredDocuments: requiredDocs.length,
      uploadedDocuments: Object.values(uploadedDocs).reduce((sum, count) => sum + count, 0),
      completionPercentage,
      isComplete: completionPercentage === 100,
      documentsByStep,
      documents: enhancedDocuments,
      generatedAt: new Date().toISOString()
    });
    
  } catch (e) {
    console.error("Required documents error:", e);
    res.status(500).json({ error: "Failed to generate document requirements" });
  } finally {
    await client.end();
  }
});

// GET /:id/required-documents/summary - Get document requirements summary
router.get("/:id/required-documents/summary", async (req, res) => {
  const client = await pgc();
  try {
    const { id } = req.params;
    
    // Quick summary without full document details
    const uploadedQuery = `
      SELECT document_type, COUNT(*) as count
      FROM documents 
      WHERE application_id = $1 
      GROUP BY document_type
    `;
    
    const uploadedResult = await client.query(uploadedQuery, [id]);
    const uploadedCount = uploadedResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);
    
    // Get basic app info for requirements calculation
    const appQuery = `
      SELECT requested_amount, form_data FROM applications WHERE id = $1
    `;
    const appResult = await client.query(appQuery, [id]);
    
    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    const formData = appResult.rows[0].form_data || {};
    const amount = appResult.rows[0].requested_amount || formData.amount || 0;
    
    // Estimate required documents count based on amount
    let estimatedRequired = 3; // Base: bank statements, tax returns, business license
    if (amount >= 100000) estimatedRequired += 1; // Financial statements
    if (amount >= 150000) estimatedRequired += 1; // Personal financial statement
    
    res.json({
      applicationId: id,
      uploadedDocuments: uploadedCount,
      estimatedRequiredDocuments: estimatedRequired,
      estimatedCompletionPercentage: Math.min(Math.round((uploadedCount / estimatedRequired) * 100), 100),
      summary: `${uploadedCount} of ~${estimatedRequired} documents uploaded`
    });
    
  } catch (e) {
    console.error("Document summary error:", e);
    res.status(500).json({ error: "Failed to generate document summary" });
  } finally {
    await client.end();
  }
});

export default router;