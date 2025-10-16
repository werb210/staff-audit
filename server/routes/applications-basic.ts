// server/routes/applications-basic.ts - Basic applications CRUD for deployment
import { Router } from "express";
import { Client } from "pg";

const router = Router();

async function pgc(){
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }});
  await c.connect(); return c;
}

// GET /api/applications - List applications
router.get("/applications", async (req: any, res: any) => {
  const client = await pgc();
  try {
    const query = `
      SELECT id, user_id, requested_amount, status, use_of_funds, created_at, updated_at
      FROM applications 
      ORDER BY created_at DESC 
      LIMIT 50
    `;
    
    const result = await client.query(query);
    const applications = result.rows.map(row => ({
      id: row.id,
      applicant: row.user_id || 'Unknown',
      amount: Number(row.requested_amount) || 0,
      stage: row.status || 'new',
      description: row.use_of_funds || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json(applications);
  } catch (e) {
    console.error("Applications list error:", e);
    res.status(500).json({ error: String(e) });
  } finally {
    await client.end();
  }
});

// GET /api/applications/:id - Get single application
router.get("/applications/:id", async (req: any, res: any) => {
  const client = await pgc();
  try {
    const { id } = req.params;
    const query = `
      SELECT * FROM applications 
      WHERE id = $1
    `;
    
    const result = await client.query(query, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    const app = result.rows[0];
    res.json({
      app: {
        id: app.id,
        legalBusinessName: app.user_id,
        contactEmail: app.user_id + '@example.com',
        contactPhone: '555-0000',
        amount: Number(app.requested_amount) || 0,
        description: app.use_of_funds || '',
        stage: app.status || 'new'
      }
    });
  } catch (e) {
    console.error("Application fetch error:", e);
    res.status(500).json({ error: String(e) });
  } finally {
    await client.end();
  }
});

// PATCH /api/applications/:id - Update application
router.patch("/applications/:id", async (req: any, res: any) => {
  const client = await pgc();
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const query = `
      UPDATE applications 
      SET updated_at = NOW(), 
          requested_amount = COALESCE($2, requested_amount),
          use_of_funds = COALESCE($3, use_of_funds)
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await client.query(query, [
      id, 
      updates.amount, 
      updates.description
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Application not found" });
    }
    
    res.json({ success: true, application: result.rows[0] });
  } catch (e) {
    console.error("Application update error:", e);
    res.status(500).json({ error: String(e) });
  } finally {
    await client.end();
  }
});

export default router;