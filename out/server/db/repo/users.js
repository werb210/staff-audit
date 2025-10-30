import { TenantRepo } from "../baseRepo";
class UsersRepo extends TenantRepo {
    async getByEmail(req, email) {
        return this.runOne(req, `SELECT * FROM users WHERE tenant_id = current_setting('app.tenant', true)::uuid AND email = $1`, [email]);
    }
    async getById(req, id) {
        return this.runOne(req, `SELECT * FROM users WHERE id = $1 AND tenant_id = current_setting('app.tenant', true)::uuid`, [id]);
    }
    async create(req, u) {
        const rows = await this.run(req, `INSERT INTO users (id, tenant_id, email, role, createdAt, updatedAt)
       VALUES ($1, current_setting('app.tenant', true)::uuid, $2, $3, NOW(), NOW())
       RETURNING *`, [u.id, u.email, u.role]);
        return rows[0];
    }
    async listAll(req) {
        return this.run(req, `SELECT * FROM users WHERE tenant_id = current_setting('app.tenant', true)::uuid ORDER BY createdAt DESC`);
    }
}
export const usersRepo = new UsersRepo();
