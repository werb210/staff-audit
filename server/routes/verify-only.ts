import { Router } from "express";
import jwt from "jsonwebtoken";
import { twilioClient } from "../lib/twilio.js";
import { Pool } from "pg";

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized:false } });

async function findOrCreateUserByPhone(e164:string){
  // Ensure users table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT,
      phone_e164 TEXT UNIQUE NOT NULL,
      email TEXT,
      roles TEXT[] NOT NULL DEFAULT ARRAY['user'],
      tenant_id UUID,
      createdAt TIMESTAMPTZ DEFAULT now(),
      updatedAt TIMESTAMPTZ DEFAULT now()
    );
  `);
  // Try find
  let r = await pool.query("SELECT * FROM users WHERE phone_e164=$1 LIMIT 1",[e164]);
  if(r.rows.length) return r.rows[0];
  // Create new minimal user
  r = await pool.query(
    "INSERT INTO users (full_name, phone_e164, roles) VALUES ($1,$2,$3) RETURNING *",
    ['New User', e164, ['user']]
  );
  return r.rows[0];
}

function issueJwt(user:any){
  const secret = process.env.JWT_SECRET;
  if(!secret) throw new Error("JWT_SECRET not set");
  const payload = { sub:user.id, phone:user.phone_e164, roles:user.roles, name:user.full_name };
  return jwt.sign(payload, secret, { expiresIn: "12h", issuer:"bf-staff" });
}

router.post("/request", async (req,res)=>{
  try{
    const { phone } = req.body||{};
    if(!phone) return res.status(400).json({error:"phone_required"});
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
    if(!verifySid) return res.status(500).json({error:"verify_service_missing"});
    const client = twilioClient();
    const r = await client.verify.v2.services(verifySid).verifications.create({ to: phone, channel: "sms" });
    res.json({ ok:true, status:r.status });
  }catch(e:any){
    res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
});

router.post("/check", async (req,res)=>{
  try{
    const { phone, code } = req.body||{};
    if(!phone||!code) return res.status(400).json({error:"phone_and_code_required"});
    const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;
    if(!verifySid) return res.status(500).json({error:"verify_service_missing"});
    const client = twilioClient();
    const r = await client.verify.v2.services(verifySid).verificationChecks.create({ to: phone, code });
    if(r.status!=="approved") return res.status(401).json({ ok:false, error:"code_not_approved", status:r.status });
    const user = await findOrCreateUserByPhone(phone);
    const token = issueJwt(user);
    res.json({ ok:true, token, user: { id:user.id, name:user.full_name, phone:user.phone_e164, roles:user.roles } });
  }catch(e:any){
    res.status(500).json({ ok:false, error:String(e?.message||e) });
  }
});

export default router;