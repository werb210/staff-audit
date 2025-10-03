import { Router } from "express";
import { Client } from "pg";
import { recommendationEngine } from "../services/recommendationEngine.js";

const router = Router();

async function pgc() {
  const c = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  return c;
}

// GET /:id/recommendations - Get lender recommendations for application
router.get("/:id/recommendations", async (req, res) => {
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
    
    // Build application object for recommendation engine
    const app = {
      id: appRow.id,
      amount: appRow.requested_amount || formData.amount || 0,
      country: appRow.submission_country || formData.country || 'US',
      timeInBusinessMonths: formData.timeInBusinessMonths || 12,
      monthlyRevenue: formData.monthlyRevenue || 0,
      industry: formData.industry || 'Other',
      product_id: appRow.product_id || formData.product_id
    };
    
    // Get recommendations from engine
    const lenders = await recommendationEngine(app);
    
    // Log recommendation for analytics
    try {
      const logQuery = `
        INSERT INTO recommendation_logs (application_id, recommended_lenders, created_at)
        VALUES ($1, $2, NOW())
      `;
      await client.query(logQuery, [id, JSON.stringify(lenders.map(l => l.id))]);
    } catch (logError) {
      console.warn('Failed to log recommendation:', logError.message);
    }
    
    res.json({
      applicationId: id,
      recommendationCount: lenders.length,
      recommendations: lenders,
      generatedAt: new Date().toISOString()
    });
    
  } catch (e) {
    console.error("Recommendations error:", e);
    res.status(500).json({ error: "Failed to generate recommendations" });
  } finally {
    await client.end();
  }
});

// GET /:id/recommendations/refresh - Force refresh recommendations
router.get("/:id/recommendations/refresh", async (req, res) => {
  const client = await pgc();
  try {
    const { id } = req.params;
    
    // Same logic as above but force fresh calculation
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
      country: appRow.submission_country || formData.country || 'US',
      timeInBusinessMonths: formData.timeInBusinessMonths || 12,
      monthlyRevenue: formData.monthlyRevenue || 0,
      industry: formData.industry || 'Other',
      product_id: appRow.product_id || formData.product_id
    };
    
    const lenders = await recommendationEngine(app);
    
    res.json({
      applicationId: id,
      recommendationCount: lenders.length,
      recommendations: lenders,
      refreshedAt: new Date().toISOString(),
      cached: false
    });
    
  } catch (e) {
    console.error("Recommendations refresh error:", e);
    res.status(500).json({ error: "Failed to refresh recommendations" });
  } finally {
    await client.end();
  }
});

export default router;