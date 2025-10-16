import { Router } from "express";
import { db } from "../db/drizzle.js";
import { sql } from "drizzle-orm";
import { requireAuth } from "../auth/verifyOnly.js";

const r = Router();
r.use(requireAuth);

// Get all budgets
r.get("/marketing/budgets", async (req: any, res: any) => {
  try {
    const { rows } = await db.execute(sql`
      SELECT * FROM marketing_budgets 
      ORDER BY source
    `);
    res.json({ ok: true, items: rows });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to fetch budgets" });
  }
});

// Create or update budget
r.post("/marketing/budgets", async (req: any, res: any) => {
  try {
    const { source, monthly_cents, alert_pct, emails = [], phones = [] } = req.body || {};
    
    if (!source || !monthly_cents) {
      return res.status(400).json({ ok: false, error: "source and monthly_cents required" });
    }
    
    const { rows } = await db.execute(sql`
      INSERT INTO marketing_budgets(source, monthly_cents, alert_pct, emails, phones)
      VALUES(${source}, ${monthly_cents}, ${alert_pct || 80}, ${JSON.stringify(emails)}::jsonb, ${JSON.stringify(phones)}::jsonb)
      ON CONFLICT (source) DO UPDATE SET 
        monthly_cents = excluded.monthly_cents, 
        alert_pct = excluded.alert_pct, 
        emails = excluded.emails, 
        phones = excluded.phones
      RETURNING *
    `);
    
    res.json({ ok: true, item: rows[0] });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to save budget" });
  }
});

// Forecast: month-to-date spend and projection vs cap
r.get("/marketing/budget/forecast", async (req: any, res: any) => {
  try {
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;
    const first = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
    
    // Get current month spending by source
    const { rows: costs } = await db.execute(sql`
      SELECT source, SUM(cost_cents) as cents 
      FROM ad_costs 
      WHERE day >= ${first} 
      GROUP BY source
    `).catch(() => ({ rows: [] }));
    
    const spent = Object.fromEntries(costs.map((c: any) => [c.source, Number(c.cents || 0)]));
    
    // Calculate pace projection
    const daysInMonth = new Date(y, m, 0).getDate();
    const dayOfMonth = today.getDate();
    const paceFactor = daysInMonth / Math.max(1, dayOfMonth);
    
    // Get budgets and create forecast
    const budgets = (await db.execute(sql`SELECT * FROM marketing_budgets`)).rows;
    const rows = budgets.map((b: any) => ({
      source: b.source,
      budget_cents: b.monthly_cents,
      spent_cents: spent[b.source] || 0,
      projected_cents: Math.round((spent[b.source] || 0) * paceFactor),
      alert_pct: b.alert_pct,
      emails: b.emails || [],
      phones: b.phones || []
    }));
    
    res.json({ ok: true, rows, daysInMonth, dayOfMonth });
  } catch (error: unknown) {
    res.status(500).json({ ok: false, error: "Failed to generate forecast" });
  }
});

export default r;