import { Router } from "express";
import { Pool } from "pg";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized:false }});
const r = Router();

async function hasCol(table:string, col:string){
  const q = await pool.query(`select 1 from information_schema.columns where table_name=$1 and column_name=$2`, [table, col]);
  return q.rowCount>0;
}

function col(...names:string[]){ return names.find(Boolean)!; }

// List - Return in format expected by frontend
r.get("/", async (_req,res)=>{
  try {
    const rs = await pool.query(`
      select id, 
             COALESCE(first_name || ' ' || last_name, email) as name, 
             email, 
             phone, 
             role, 
             createdAt,
             is_active
      from users 
      where is_active = true OR is_active IS NULL
      order by createdAt desc nulls last
    `);
    console.log(`✅ [USERS-API] Returning ${rs.rows.length} users`);
    res.json({ ok: true, data: rs.rows });
  } catch (error: unknown) {
    console.error("❌ [USERS-API] Error fetching users:", error);
    res.status(500).json({ ok: false, error: "Failed to fetch users" });
  }
});

// Create - Return proper response format
r.post("/", async (req,res)=>{
  try {
    const id = crypto.randomUUID();
    const { name, email, phone, role="user", password } = req.body||{};
    const passHash = password ? await bcrypt.hash(password, 10) : null;

    await pool.query(`
      insert into users (id, first_name, email, phone, role, password_hash, createdAt, updatedAt) 
      values ($1, $2, $3, $4, $5, $6, now(), now())
    `, [id, name, email, phone, role, passHash]);
    
    // Return the created user
    const result = await pool.query(`
      select id, COALESCE(first_name || ' ' || last_name, email) as name, email, phone, role, createdAt
      from users where id = $1
    `, [id]);
    
    console.log(`✅ [USERS-API] Created user: ${email}`);
    res.status(201).json({ ok: true, data: result.rows[0] });
  } catch (error: unknown) {
    console.error("❌ [USERS-API] Error creating user:", error);
    res.status(500).json({ ok: false, error: "Failed to create user" });
  }
});

// Update - Return proper response format
r.patch("/:id", async (req,res)=>{
  try {
    const { id } = req.params;
    const { name, email, phone, role } = req.body||{};
    
    const updateSets = [];
    const updateVals = [];
    if(name !== undefined) { updateSets.push(`first_name=$${updateSets.length+1}`); updateVals.push(name); }
    if(email !== undefined) { updateSets.push(`email=$${updateSets.length+1}`); updateVals.push(email); }
    if(phone !== undefined) { updateSets.push(`phone=$${updateSets.length+1}`); updateVals.push(phone); }
    if(role !== undefined) { updateSets.push(`role=$${updateSets.length+1}`); updateVals.push(role); }
    
    if(!updateSets.length) return res.json({ok:true});
    
    updateVals.push(id);
    await pool.query(`update users set ${updateSets.join(",")}, updatedAt=now() where id=$${updateVals.length}`, updateVals);
    
    // Return the updated user
    const result = await pool.query(`
      select id, COALESCE(first_name || ' ' || last_name, email) as name, email, phone, role, updatedAt
      from users where id = $1
    `, [id]);
    
    console.log(`✅ [USERS-API] Updated user: ${id}`);
    res.json({ ok: true, data: result.rows[0] });
  } catch (error: unknown) {
    console.error("❌ [USERS-API] Error updating user:", error);
    res.status(500).json({ ok: false, error: "Failed to update user" });
  }
});

// Delete (soft if deleted_at exists)
r.delete("/:id", async (req,res)=>{
  const { id } = req.params;
  if(await hasCol("users","deleted_at")){
    await pool.query(`update users set deleted_at=now() where id=$1`, [id]);
  } else {
    await pool.query(`delete from users where id=$1`, [id]);
  }
  res.json({ok:true});
});

export default r;