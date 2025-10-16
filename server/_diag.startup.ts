// server/_diag.startup.ts
import type express from "express";
import { Pool } from "pg";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";

const g = (b: boolean) => (b ? "🟢" : "🔴");

function pickDbUrl() {
  const isProd = process.env.NODE_ENV === "production";
  const prod = process.env.DATABASE_URL_PROD;
  const local = process.env.DATABASE_URL;
  return (isProd && prod) ? prod : local;
}

async function checkDb() {
  const url = pickDbUrl();
  if (!url) return { ok: false, message: "DATABASE_URL* not set" };
  const pool = new Pool({ connectionString: url, idleTimeoutMillis: 2_000, connectionTimeoutMillis: 2_000 });
  try {
    const { rows } = await pool.query("select version()");
    await pool.end();
    return { ok: true, message: rows?.[0]?.version || "connected" };
  } catch (e: any) {
    try { await pool.end(); } catch {}
    return { ok: false, message: e?.message || "db error" };
  }
}

async function checkS3() {
  const bucket = process.env.CORRECT_S3_BUCKET_NAME || process.env.S3_BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME;
  const region = process.env.AWS_REGION || "ca-central-1";
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!bucket || !accessKeyId || !secretAccessKey) {
    return { ok: false, message: "S3 env missing (bucket/keys)" };
  }
  const s3 = new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return { ok: true, message: `bucket:${bucket} @ ${region}` };
  } catch (e: any) {
    return { ok: false, message: e?.name === "NotFound" ? "bucket not found" : e?.message || "s3 error" };
  }
}

function checkTwilio() {
  const ok =
    !!process.env.TWILIO_ACCOUNT_SID &&
    !!process.env.TWILIO_AUTH_TOKEN &&
    !!process.env.TWILIO_PHONE_NUMBER;
  return { ok, message: ok ? "env present" : "missing env" };
}

export type StartupHealth = {
  ok: boolean;
  parts: { db: ReturnType<typeof wrap>; s3: ReturnType<typeof wrap>; twilio: ReturnType<typeof wrap> };
  ts: number;
};

function wrap<T extends { ok: boolean; message: string }>(v: T) {
  return v;
}

export async function runStartupDiagnostics(app: express.Application) {
  const [db, s3, twilio] = await Promise.all([checkDb(), checkS3(), checkTwilio()]);
  const health: StartupHealth = {
    ok: db.ok && s3.ok && twilio.ok,
    parts: { db: wrap(db), s3: wrap(s3), twilio: wrap(twilio) },
    ts: Date.now(),
  };

  // Log pretty summary
  console.log("════════════════ Startup Diagnostics ════════════════");
  console.log(` DB     ${g(db.ok)}  ${db.message}`);
  console.log(` S3     ${g(s3.ok)}  ${s3.message}`);
  console.log(` Twilio ${g(twilio.ok)}  ${twilio.message}`);
  console.log(` OVERALL ${g(health.ok)}  (${process.env.NODE_ENV || "dev"})`);
  console.log("═════════════════════════════════════════════════════");

  // Expose probe endpoint
  app.get("/api/_int/db-health", (_req, res) => res.json(health));
}
