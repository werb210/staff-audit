// Debug route to verify tenant isolation system
import { Router } from "express";

const router = Router();

// Debug route to show current DB role, tenant setting, and user info
router.get('/debug', async (req: any, res: any) => {
  try {
    if (!(req as any).pg) {
      return res.json({
        error: "No per-request PG client found",
        tenantId: (req as any).tenantId,
        user: (req as any).user?.email || 'anonymous'
      });
    }

    // Query current database state
    const client = (req as any).pg;
    
    const [roleResult, tenantResult, userResult] = await Promise.all([
      client.query('SELECT current_role'),
      client.query("SELECT current_setting('app.tenant', true) as tenant"),
      client.query('SELECT current_user')
    ]);

    // Test tenant isolation by counting users in current tenant
    const userCount = await client.query(`
      SELECT COUNT(*) as count 
      FROM users 
      WHERE tenant_id = current_setting('app.tenant', true)::uuid
    `);

    res.json({
      ok: true,
      debug: {
        currentRole: roleResult.rows[0]?.current_role,
        tenantSetting: tenantResult.rows[0]?.tenant,
        currentUser: userResult.rows[0]?.current_user,
        tenantUserCount: userCount.rows[0]?.count,
        requestTenantId: (req as any).tenantId,
        requestUser: (req as any).user?.email || 'anonymous'
      }
    });
  } catch (error: unknown) {
    res.status(500).json({
      error: error instanceof Error ? error.message : String(error),
      tenantId: (req as any).tenantId,
      user: (req as any).user?.email || 'anonymous'
    });
  }
});

export default router;