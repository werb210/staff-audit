import { Router } from "express";
import { Client } from "pg";
import rateLimit from "express-rate-limit";          // ← added
import { randomBytes } from "crypto";                // ← added
import { documentBuilder } from "../services/documentBuilder.js";

const router = Router();

// Apply rate limiting for this module
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,                  // limit each IP to 100 requests
  standardHeaders: true,
  legacyHeaders: false,
});
router.use(limiter);

// Secure random generator example (used if you need unique tokens)
const secureId = () => randomBytes(16).toString("hex");

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
    const app = {
      id: appRow.id,
      amount: appRow.requested_amount || formData.amount || 0,
      country: appRow.submission_country || formData.country || "US",
      timeInBusinessMonths: formData.timeInBusinessMonths || 12,
      monthlyRevenue: formData.monthlyRevenue || 0,
      industry: formData.industry || "Other",
      product_id: appRow.product_id || formData.product_id
    };

    const documents = await documentBuilder(app);

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
    }, {} as Record<string, number>);

    const enhancedDocuments = documents.map(doc => ({
      ...doc,
      uploaded: uploadedDocs[doc.document_type] || 0,
      status: (uploadedDocs[doc.document_type] || 0) > 0 ? "uploaded" : "pending"
    }));

    const requiredDocs = enhancedDocuments.filter(d => d.required);
    const uploadedRequiredDocs = requiredDocs.filter(d => d.uploaded > 0);
    const completionPercentage =
      requiredDocs.length > 0
        ? Math.round((uploadedRequiredDocs.length / requiredDocs.length) * 100)
        : 0;

    const documentsByStep = enhancedDocuments.reduce((acc, doc) => {
      (acc[doc.step] ||= []).push(doc);
      return acc;
    }, {} as Record<number, any[]>);

    res.json({
      applicationId: id,
      totalDocuments: enhancedDocuments.length,
      requiredDocuments: requiredDocs.length,
      uploadedDocuments: Object.values(uploadedDocs).reduce((sum, c) => sum + c, 0),
      completionPercentage,
      isComplete: completionPercentage === 100,
      documentsByStep,
      documents: enhancedDocuments,
      generatedAt: new Date().toISOString(),
      secureRequestId: secureId(),          // optional audit token
    });
  } catch (e) {
    console.error("Required documents error:", e);
    res.status(500).json({ error: "Failed to generate document requirements" });
  } finally {
    await client.end();
  }
});

// GET /:id/required-documents/summary - Quick document summary
router.get("/:id/required-documents/summary", async (req, res) => {
  const client = await pgc();
  try {
    const { id } = req.params;
    const uploadedQuery = `
      SELECT document_type, COUNT(*) as count
      FROM documents 
      WHERE application_id = $1 
      GROUP BY document_type
    `;
    const uploadedResult = await client.query(uploadedQuery, [id]);
    const uploadedCount = uploadedResult.rows.reduce((sum, row) => sum + parseInt(row.count), 0);

    const appQuery = `SELECT requested_amount, form_data FROM applications WHERE id = $1`;
    const appResult = await client.query(appQuery, [id]);
    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }

    const formData = appResult.rows[0].form_data || {};
    const amount = appResult.rows[0].requested_amount || formData.amount || 0;
    let estimatedRequired = 3;
    if (amount >= 100000) estimatedRequired += 1;
    if (amount >= 150000) estimatedRequired += 1;

    res.json({
      applicationId: id,
      uploadedDocuments: uploadedCount,
      estimatedRequiredDocuments: estimatedRequired,
      estimatedCompletionPercentage: Math.min(Math.round((uploadedCount / estimatedRequired) * 100), 100),
      summary: `${uploadedCount} of ~${estimatedRequired} documents uploaded`,
    });
  } catch (e) {
    console.error("Document summary error:", e);
    res.status(500).json({ error: "Failed to generate document summary" });
  } finally {
    await client.end();
  }
});

export default router;
