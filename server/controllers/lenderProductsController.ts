import { Request, Response } from "express";
import { pool } from "../db";

export async function getLenderProducts(req: Request, res: Response) {
  try {
    const { applicationId } = req.query;

    // If applicationId provided, check document approval status
    if (applicationId) {
      console.log(`🔍 [LENDER-CTRL] Checking document approval for application ${applicationId}`);
      
      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(applicationId.toString())) {
        return res.status(400).json({ 
          ok: false, 
          error: "Invalid application ID format" 
        });
      }
      
      const appResult = await pool.query(`
        SELECT a.id, a.status as app_status,
               COUNT(d.id) as total_docs,
               COUNT(CASE WHEN d.status = 'accepted' THEN 1 END) as accepted_docs
        FROM applications a
        LEFT JOIN documents d ON a.id = d.application_id
        WHERE a.id = $1
        GROUP BY a.id, a.status
      `, [applicationId]);

      if (appResult.rows.length === 0) {
        return res.status(404).json({ ok: false, error: "Application not found" });
      }

      const app = appResult.rows[0];
      // ✅ Only allow lender products if ALL required documents approved
      const hasRequiredDocuments = app.total_docs > 0;
      const allDocsAccepted = app.accepted_docs === app.total_docs && app.total_docs > 0;

      if (!hasRequiredDocuments) {
        console.log(`🚫 [LENDER-CTRL] No documents uploaded for application ${applicationId}`);
        return res.status(403).json({
          ok: false,
          error: "Documents not approved",
          details: "No documents have been uploaded for this application"
        });
      }

      if (!allDocsAccepted) {
        console.log(`🚫 [LENDER-CTRL] Document approval incomplete: ${app.accepted_docs}/${app.total_docs} approved`);
        return res.status(403).json({
          ok: false,
          error: "Documents not approved",
          details: `${app.accepted_docs} of ${app.total_docs} documents approved. All documents must be accepted.`
        });
      }

      console.log(`✅ [LENDER-CTRL] All ${app.accepted_docs} documents approved for application ${applicationId}`);
    }

    // Fetch active lender products
    const productsResult = await pool.query(`
      SELECT 
        id,
        lender_name,
        product_name as name,
        product_type as category,
        amount_min as min_amount,
        amount_max as max_amount,
        interest_rate_min,
        interest_rate_max,
        term_min,
        term_max,
        min_credit_score,
        description,
        country_offered as country,
        is_active as active
      FROM lender_products 
      WHERE is_active = true
      ORDER BY lender_name, product_name
    `);

    const products = productsResult.rows.map((p: any) => ({
      id: p.id,
      lender_name: p.lender_name,
      name: p.name || "",
      category: p.category || "business_loan",
      min_amount: p.min_amount || 0,
      max_amount: p.max_amount || 0,
      interest_rate: p.interest_rate_min && p.interest_rate_max ? 
        `${p.interest_rate_min}% - ${p.interest_rate_max}%` : "TBD",
      term: p.term_min && p.term_max ? 
        `${p.term_min} - ${p.term_max} months` : null,
      min_credit_score: p.min_credit_score,
      description: p.description || "",
      country: p.country || "CA",
      active: p.active
    }));

    console.log(`📦 [LENDER-CTRL] Returning ${products.length} lender products${applicationId ? ` for application ${applicationId}` : ''}`);
    
    return res.json({ 
      ok: true, 
      products,
      meta: {
        total: products.length,
        applicationId: applicationId || null,
        documentsVerified: !!applicationId
      }
    });

  } catch (err) {
    console.error("❌ [LENDER-CTRL] Lender products fetch failed:", err);
    return res.status(500).json({ ok: false, error: "Server failure" });
  }
}