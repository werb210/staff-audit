import { mapToCanonical } from "../mappings/applicationFieldMap";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function applyMapping(applicationId: string, raw: any) {
  const { canonical, unmapped, coverage } = mapToCanonical(raw || {});
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE applications
         SET fields_raw = $2,
             fields_canonical = $3,
             fields_unmapped = $4,
             fields_coverage = $5,
             last_mapped_at = NOW()
       WHERE id = $1`,
      [applicationId, raw, canonical, unmapped, coverage]
    );

    // Optionally hydrate legacy columns if they exist
    await client.query(`
      UPDATE applications
         SET requested_amount = COALESCE((fields_canonical->>'requested_amount')::numeric, requested_amount),
             legal_business_name = COALESCE(fields_canonical->>'legal_name', legal_business_name),
             business_name = COALESCE(fields_canonical->>'display_name', business_name)
       WHERE id = $1
    `, [applicationId]);

    await client.query("COMMIT");
    return { coverage, unmapped, canonical };
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}