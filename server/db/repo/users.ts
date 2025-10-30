import { TenantRepo } from "../baseRepo";
import { Role, TenantId, User } from "../types";

class UsersRepo extends TenantRepo {
  async getByEmail(req: any, email: string): Promise<User | null> {
    return this.runOne<User>(req, 
      `SELECT * FROM users WHERE tenant_id = current_setting('app.tenant', true)::uuid AND email = $1`, 
      [email]
    );
  }
  
  async getById(req: any, id: string): Promise<User | null> {
    return this.runOne<User>(req, 
      `SELECT * FROM users WHERE id = $1 AND tenant_id = current_setting('app.tenant', true)::uuid`, 
      [id]
    );
  }
  
  async create(req: any, u: Partial<User> & { id: string; email: string; role: Role }): Promise<User> {
    const rows = await this.run<User>(req,
      `INSERT INTO users (id, tenant_id, email, role, createdAt, updatedAt)
       VALUES ($1, current_setting('app.tenant', true)::uuid, $2, $3, NOW(), NOW())
       RETURNING *`,
      [u.id, u.email, u.role]
    );
    return rows[0];
  }
  
  async listAll(req: any): Promise<User[]> {
    return this.run<User>(req, 
      `SELECT * FROM users WHERE tenant_id = current_setting('app.tenant', true)::uuid ORDER BY createdAt DESC`
    );
  }
}

export const usersRepo = new UsersRepo();