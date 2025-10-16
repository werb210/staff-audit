import { Router, Request, Response } from "express";
import { pool } from "../../db";

const router = Router();

// Exactly one canonical handler
router.get("/lenders", async (_req: Request, res: Response) => {
  try {
    // Use existing lenders view or table
    const { rows } = await pool.query(`
      SELECT id, name, status, country, categories 
      FROM lender_products_view 
      ORDER BY name ASC
    `);
    res.json(rows);
  } catch (error: unknown) {
    console.error("Lenders endpoint error:", error);
    res.status(500).json({ error: "internal_server_error" });
  }
});

export default router;