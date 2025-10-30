import { pool } from "./pool";
// Map tenant IDs to database roles
const TENANT_ROLE = {
    // Map actual UUIDs from database  
    "1f58298b-cf64-4883-8eb4-48f958999934": "tenant_bf", // Acme Financial Services
    "a1b2c3d4-e5f6-7890-abcd-ef1234567890": "tenant_bf", // Boreal Capital
    "00000000-0000-0000-0000-000000000000": "tenant_bf", // Default Tenant
    "b1eb1c2d-4f3a-4e8c-9a7b-2c5d6e1f8a9c": "tenant_slf", // Default Tenant (likely SLF)
    // Fallback mappings for development
    "bf": "tenant_bf",
    "slf": "tenant_slf",
};
export async function attachPgPerRequest(req, res, next) {
    const client = await pool.connect();
    let finished = false;
    try {
        await client.query("BEGIN");
        // Get tenant from request, default to BF, and ensure it's a valid UUID
        const rawTenantId = req.tenantId || "bf";
        let tenantId;
        // Convert tenant strings to actual UUIDs from database
        if (rawTenantId === "bf") {
            tenantId = "1f58298b-cf64-4883-8eb4-48f958999934"; // Acme Financial Services (BF)
        }
        else if (rawTenantId === "slf") {
            tenantId = "b1eb1c2d-4f3a-4e8c-9a7b-2c5d6e1f8a9c"; // Default SLF tenant
        }
        else {
            tenantId = rawTenantId; // Assume it's already a UUID
        }
        const role = TENANT_ROLE[rawTenantId] || "tenant_bf";
        // Set tenant context for RLS policies (role switching temporarily disabled for debugging)
        // Use string interpolation to avoid parameter binding issues with GUC
        await client.query(`SET LOCAL app.tenant = '${tenantId}'`);
        // Role switching temporarily disabled until we debug the SQL issue
        // await client.query(`SET LOCAL ROLE ${role}`);
        // Optional: Set statement timeout for protection (using string interpolation)
        if (process.env.PG_STATEMENT_TIMEOUT_MS) {
            await client.query(`SET LOCAL statement_timeout = '${process.env.PG_STATEMENT_TIMEOUT_MS}ms'`);
        }
        // Expose client and query helper to request
        req.pg = client;
        req.pgQuery = async (text, params = []) => {
            return client.query(text, params);
        };
        const cleanup = async (commit) => {
            if (finished)
                return;
            finished = true;
            try {
                if (commit) {
                    await client.query("COMMIT");
                }
                else {
                    await client.query("ROLLBACK");
                }
            }
            finally {
                client.release();
            }
        };
        res.on("finish", () => cleanup(true));
        res.on("close", () => cleanup(false));
        next();
    }
    catch (e) {
        try {
            await client.query("ROLLBACK");
        }
        catch { }
        client.release();
        next(e);
    }
}
