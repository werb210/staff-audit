import { Router } from "express";
const r = Router();

async function head(url: string) {
  try { const res = await fetch(url, { method: "HEAD" }); return res.status < 400; }
  catch { return false; }
}

r.get("/api/_int/dialer/diag", async (req: any, res: any) => {
  const base = `http://localhost:${process.env.PORT || 5000}`;

  // check env + routes that the dialer needs
  const env = {
    TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
    TWILIO_API_KEY_SID: !!process.env.TWILIO_API_KEY_SID,
    TWILIO_API_KEY_SECRET: !!process.env.TWILIO_API_KEY_SECRET,
    TWILIO_TWIML_APP_SID: !!process.env.TWILIO_TWIML_APP_SID,
    TWILIO_CALLER_ID: !!process.env.TWILIO_CALLER_ID,
    WS_PATH: process.env.WS_PATH || "/ws",
  };

  const routes = {
    token: await head(`${base}/api/voice/token`),
    // optional voice actions if you wired them:
    record: await head(`${base}/api/voice/record`).catch(() => false),
    hold:   await head(`${base}/api/voice/hold`).catch(() => false),
  };

  // Did the new client build with the dialer ship?
  // We expect the dialer chunk to exist or the app to expose a build id.
  const client = {
    VITE_GA_MEASUREMENT_ID: !!process.env.VITE_GA_MEASUREMENT_ID, // noisy warnings only
    buildId: process.env.BUILD_ID || null,
  };

  const ok = env.TWILIO_ACCOUNT_SID && env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET &&
             env.TWILIO_TWIML_APP_SID && routes.token;

  let narrative =
`Dialer ${ok ? "READY" : "NOT READY"}.
Env: Twilio ${env.TWILIO_ACCOUNT_SID && env.TWILIO_API_KEY_SID && env.TWILIO_API_KEY_SECRET && env.TWILIO_TWIML_APP_SID ? "OK" : "missing"}.
Routes: /api/voice/token ${routes.token ? "OK" : "FAIL"}.
Client: buildId=${client.buildId ?? "n/a"}.
If token=FAIL you'll see 401s and the panel won't open. If buildId is old, the new UI didn't ship.`;

  res.json({ ok, env, routes, client, narrative });
});

export default r;