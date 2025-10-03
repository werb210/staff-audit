import { Router } from "express";
import { Client } from "pg";
import crypto from "crypto";

const router = Router();

async function pgc() {
  const c = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false }
  });
  await c.connect();
  return c;
}

// POST /api/applications - Create new application
router.post("/", async (req, res) => {
  const client = await pgc();
  try {
    const {
      product_id,
      country,
      amount,
      timeInBusinessMonths,
      monthlyRevenue,
      industry,
      business_name,
      contact_email,
      contact_phone
    } = req.body;

    // Generate proper UUID for application
    const appId = crypto.randomUUID();
    
    const query = `
      INSERT INTO applications (
        id, 
        requested_amount, 
        use_of_funds, 
        status,
        form_data,
        product_id,
        submission_country,
        business_name,
        contact_email,
        contact_phone,
        annual_revenue,
        years_in_business,
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id, status, created_at
    `;
    
    const formData = {
      product_id,
      country,
      amount,
      timeInBusinessMonths,
      monthlyRevenue,
      industry,
      business_name,
      contact_email,
      contact_phone
    };
    
    const result = await client.query(query, [
      appId,
      amount,
      `${industry} business funding`,
      JSON.stringify(formData),
      product_id,
      country,
      business_name || 'Business Name',
      contact_email || 'contact@example.com',
      contact_phone || '555-123-4567',
      monthlyRevenue * 12, // Convert monthly to annual revenue
      Math.floor(timeInBusinessMonths / 12) // Convert months to years
    ]);
    
    const app = result.rows[0];
    
    res.status(201).json({
      id: app.id,
      status: app.status,
      created_at: app.created_at,
      product_id,
      country,
      amount,
      timeInBusinessMonths,
      monthlyRevenue,
      industry
    });
  } catch (e) {
    console.error("Application creation error:", e);
    res.status(500).json({ error: "Failed to create application" });
  } finally {
    await client.end();
  }
});

// GET /api/applications/:id - Get application by ID
router.get("/:id", async (req, res) => {
  const client = await pgc();
  try {
    const { id } = req.params;
    
    const query = `
      SELECT id, requested_amount, use_of_funds, status, form_data, 
             product_id, submission_country, created_at, updated_at
      FROM applications 
      WHERE id = $1
    `;
    
    const result = await client.query(query, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    const app = result.rows[0];
    const formData = app.form_data || {};
    
    res.json({
      id: app.id,
      status: app.status,
      amount: app.requested_amount,
      product_id: app.product_id,
      country: app.submission_country,
      ...formData,
      created_at: app.created_at,
      updated_at: app.updated_at
    });
  } catch (e) {
    console.error("Application fetch error:", e);
    res.status(500).json({ error: "Failed to fetch application" });
  } finally {
    await client.end();
  }
});

export default router;