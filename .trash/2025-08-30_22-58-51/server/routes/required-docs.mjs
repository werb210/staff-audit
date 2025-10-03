import express from "express";
import { Pool } from "pg";
import { z } from "zod";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const Input = z.object({
  productId: z.string().min(1).optional(),
  category:  z.string().min(1).optional(),
  country:   z.string().min(2).max(2).optional(), // 'US' | 'CA'
  amount:    z.number().positive().optional(),
  lenderId:  z.string().optional(),
});

export const requiredDocsRouter = express.Router();

requiredDocsRouter.post("/", async (req, res) => {
  try {
    const input = Input.parse(req.body ?? {});

    // 1) Resolve product (prefer explicit productId; otherwise take any matching product)
    let productRow = null;
    if (input.productId) {
      const { rows } = await pool.query(
        `SELECT id::text AS id, COALESCE(category::text, product_category) AS category
           FROM crm_lender_products_canon
          WHERE id::text = $1
          LIMIT 1`,
        [input.productId]
      );
      productRow = rows[0] ?? null;
    } else if (input.category && input.country) {
      // find a representative product of that category/country in range (if amount provided)
      const params = [input.category, input.country.toUpperCase()];
      let where = `category = $1 AND country = $2 AND active = TRUE`;
      if (input.amount) {
        params.push(input.amount, input.amount);
        where += ` AND min_amount <= $3 AND max_amount >= $4`;
      }
      const { rows } = await pool.query(
        `SELECT id::text AS id, category FROM crm_lender_products_canon WHERE ${where} LIMIT 1`,
        params
      );
      productRow = rows[0] ?? null;
    }

    // 2) Load saved requirements (if we could resolve a product)
    let docs = [];
    if (productRow?.id) {
      const { rows } = await pool.query(
        `SELECT doc_key, label, required, meta
           FROM lender_doc_requirements
          WHERE lender_product_id = $1
          ORDER BY doc_key`,
        [productRow.id]
      );
      docs = rows.map(r => ({
        key: r.doc_key,
        label: r.label,
        required: r.required,
        reason: r.meta?.reason ?? undefined,
        months: r.meta?.months ?? undefined
      }));
    }

    // 3) Guarantee baseline doc: "Last 6 months bank statements"
    const hasBank = docs.some(d => d.key === "bank_statements");
    if (!hasBank) {
      docs.unshift({
        key: "bank_statements",
        label: "Last 6 months bank statements",
        required: true,
        months: 6
      });
    } else {
      // normalize to minimum 6 months
      docs = docs.map(d => d.key !== "bank_statements"
        ? d
        : ({
            ...d,
            required: true,
            months: Math.max(6, Number(d.months ?? 0)),
            label: "Last 6 months bank statements"
          })
      );
    }

    res.json({ productId: productRow?.id ?? null, documents: docs });
  } catch (err) {
    res.status(400).json({ error: "bad_request", message: String(err?.message ?? err) });
  }
});