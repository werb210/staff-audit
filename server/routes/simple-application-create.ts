// Simple application creation endpoint for E2E verification
import { Router } from "express";
import { Client } from "pg";
import crypto from "crypto";

const router = Router();

async function pgc(){
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
  await c.connect(); return c;
}

// POST /public/applications - Create application for E2E testing
router.post("/public/applications", async (req: any, res: any) => {
  const client = await pgc();
  try {
    const { product_id, country, amount, timeInBusinessMonths, monthlyRevenue, industry } = req.body;
    
    // Generate proper UUID for application
    const appId = crypto.randomUUID();
    
    const query = `
      INSERT INTO applications (id, user_id, requested_amount, use_of_funds, status, submission_country, product_id, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'draft', $5, $6, NOW(), NOW())
      RETURNING id
    `;
    
    const result = await client.query(query, [
      appId,
      `${industry}-business`, 
      amount,
      `${industry} business funding for $${amount}`,
      country,
      product_id || '550e8400-e29b-41d4-a716-446655440000'
    ]);
    
    res.status(201).json({ 
      id: appId,
      message: 'application created',
      product_id,
      country,
      amount,
      timeInBusinessMonths,
      monthlyRevenue,
      industry
    });
  } catch (e) {
    console.error("Application creation error:", e);
    res.status(500).json({ error: String(e) });
  } finally {
    await client.end();
  }
});

export default router;