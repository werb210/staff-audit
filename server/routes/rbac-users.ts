import { Router } from "express";
import { Client } from 'pg';

const r = Router();

// Tolerant user list endpoint
r.get("/auth/users", async (req: any, res: any) => {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    const result = await client.query(`
      SELECT 
        id,
        COALESCE(first_name || ' ' || last_name, first_name, last_name, email) as name,
        first_name,
        last_name,
        email,
        phone,
        role,
        createdAt
      FROM users 
      ORDER BY createdAt DESC
    `);
    
    const users = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      full_name: row.name,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      role: row.role || 'user',
      active: true,
      createdAt: row.createdAt
    }));
    
    await client.end();
    res.json(users);
  } catch (error: unknown) {
    console.error('[rbac-users] List error:', error);
    res.json([]);
  }
});

// Create user endpoint
r.post("/auth/register", async (req: any, res: any) => {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    const { name, full_name, email, phone, role = 'user', password } = req.body;
    const displayName = name || full_name || email.split('@')[0];
    
    const nameParts = displayName.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    const result = await client.query(`
      INSERT INTO users (first_name, last_name, email, phone, role) 
      VALUES ($1, $2, $3, $4, $5) 
      RETURNING id
    `, [firstName, lastName, email, phone, role]);
    
    await client.end();
    res.json({ id: result.rows[0].id, success: true });
  } catch (error: unknown) {
    console.error('[rbac-users] Create error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Update user endpoint
r.patch("/auth/users/:id", async (req: any, res: any) => {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    const { id } = req.params;
    const { name, full_name, phone, role } = req.body;
    const displayName = name || full_name;
    
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (displayName) {
      const nameParts = displayName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      updates.push(`first_name = $${paramCount++}, last_name = $${paramCount++}`);
      values.push(firstName, lastName);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone);
    }
    if (role) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    
    if (updates.length > 0) {
      values.push(id);
      await client.query(`
        UPDATE users 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount}
      `, values);
    }
    
    await client.end();
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('[rbac-users] Update error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Delete user endpoint
r.delete("/auth/users/:id", async (req: any, res: any) => {
  try {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    
    const { id } = req.params;
    await client.query('DELETE FROM users WHERE id = $1', [id]);
    
    await client.end();
    res.json({ success: true });
  } catch (error: unknown) {
    console.error('[rbac-users] Delete error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export default r;
