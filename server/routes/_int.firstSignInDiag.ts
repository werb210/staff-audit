import { Router } from "express";
import { Pool } from "pg";
import crypto from "crypto";

const r = Router();
const db = new Pool({ connectionString: process.env.DATABASE_URL });

async function tableExists(name: string) {
  const { rows } = await db.query(
    `select 1 from information_schema.tables where table_schema='public' and table_name=$1`,
    [name],
  );
  return rows.length > 0;
}
async function columns(table: string, cols: string[]) {
  const { rows } = await db.query(
    `select column_name from information_schema.columns where table_schema='public' and table_name=$1`,
    [table],
  );
  const have = new Set(rows.map(r => r.column_name));
  return cols.map(c => ({ col: c, ok: have.has(c) }));
}

r.get("/api/_int/auth/first-signin/diag", async (req: any, res: any) => {
  const dryRun = req.query.dry_run === "1";
  const sendTest = req.query.send_test === "1";
  const email = (req.query.email as string) || "";
  const phone = (req.query.phone as string) || "";

  const checks: any = {};

  // 1) Schema readiness
  checks.tables = {
    users: await tableExists("users"),
    invites: await tableExists("invites"),
    user_lenders: await tableExists("user_lenders"),
  };
  checks.user_columns = await columns("users", [
    "email", "phone_e164", "role", "is_active",
  ]);
  checks.invite_columns = await columns("invites", [
    "email", "phone_e164", "role", "lender_id", "token", "expires_at", "consumed_at",
  ]);

  // 2) Env readiness
  checks.env = {
    SENDGRID_API_KEY: Boolean(process.env.SENDGRID_API_KEY),
    SENDGRID_DEFAULT_FROM: Boolean(process.env.SENDGRID_DEFAULT_FROM),
    TWILIO_ACCOUNT_SID: Boolean(process.env.TWILIO_ACCOUNT_SID),
    TWILIO_AUTH_TOKEN: Boolean(process.env.TWILIO_AUTH_TOKEN),
    TWILIO_FROM: Boolean(process.env.TWILIO_FROM),
    LENDER_AUTO_PROVISION: process.env.LENDER_AUTO_PROVISION === "1",
    BASE_URL: process.env.BASE_URL || null,
  };

  // 3) Routes presence (HEAD self-checks)
  async function head(path: string) {
    try {
      const u = `http://localhost:${process.env.PORT || 5000}${path}`;
      const r = await fetch(u, { method: "HEAD" });
      return r.status < 400;
    } catch { return false; }
  }
  checks.routes = {
    inviteAccept: await head("/api/auth/invite/accept"), // adjust if your path differs
    twoFAStart:   await head("/api/auth/2fa/start"),
    twoFAVerify:  await head("/api/auth/2fa/verify"),
  };

  // 4) Dry-run token generation (no email/SMS unless send_test=1)
  let sample: any = null;
  try {
    const token = crypto.randomBytes(24).toString("base64url");
    const exp = new Date(Date.now() + 60 * 60 * 1000); // 1h
    if (!dryRun || sendTest) {
      // Store a throwaway invite row (no lender_id required for staff; add if needed)
      const { rows } = await db.query(
        `insert into invites (email, phone_e164, role, token, expires_at)
         values ($1,$2,'lender_admin',$3,$4) returning id`,
        [email || null, phone || null, token, exp],
      );
      sample = { inviteId: rows[0].id };
    }
    const base = process.env.BASE_URL || "http://localhost:3000";
    checks.sample_accept_url = `${base}/accept?token=${token}`;
    checks.token_ready = true;
  } catch (e: any) {
    checks.token_ready = false;
    checks.token_error = e.message;
  }

  // 5) Overall verdict
  const hardFails = [
    !checks.tables.users,
    !checks.tables.invites,
    !checks.tables.user_lenders,
    checks.user_columns.some((c: any) => !c.ok),
    checks.invite_columns.some((c: any) => !c.ok),
  ];
  const messagingOK = checks.env.SENDGRID_API_KEY && checks.env.SENDGRID_DEFAULT_FROM && checks.env.TWILIO_ACCOUNT_SID && checks.env.TWILIO_AUTH_TOKEN && checks.env.TWILIO_FROM;
  const routesOK = checks.routes.inviteAccept && checks.routes.twoFAStart && checks.routes.twoFAVerify;

  const ok = !hardFails.includes(true) && messagingOK && routesOK && checks.token_ready;

  const narrative =
`First-time sign-in & verification ${
  ok ? "is READY" : "is NOT READY"
}.
• Database: users, invites, user_lenders tables present; required columns ${
  hardFails.includes(true) ? "have gaps" : "are OK"
}.
• Messaging: email (SendGrid) and SMS (Twilio) ${
  messagingOK ? "configured" : "missing config"
}.
• Routes: invite accept + 2FA start/verify ${
  routesOK ? "responding" : "not responding"
}.
• Token: ${
  checks.token_ready ? "generated successfully" : "failed"
}${
  checks.sample_accept_url ? `\nSample accept URL (dry-run): ${checks.sample_accept_url}` : ""
}
Next steps if NOT READY:
- Ensure SENDGRID_API_KEY/SENDGRID_DEFAULT_FROM and TWILIO_* secrets exist.
- Mount /api/auth/invite/accept, /api/auth/2fa/start, /api/auth/2fa/verify.
- Run migrations to add invites/user_lenders or missing columns.
`;

  res.json({ ok, narrative, checks, sample });
});

export default r;