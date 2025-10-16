import express from "express";

const app = express();
const startedAt = new Date().toISOString();

app.get("/api/health", (_req, res) => {
  res.json({ 
    ok: true, 
    service: "staff-safe-ts", 
    startedAt, 
    now: new Date().toISOString() 
  });
});

app.get("/", (_req, res) => {
  res.type("text/plain").send(`Staff SAFE TypeScript server
- Health: /api/health
- Started: ${startedAt}
- Using Express with TypeScript
`);
});

const port = Number(process.env.PORT || 5000);
const host = process.env.HOST || "0.0.0.0";

app.listen(port, host, () => {
  console.log(`[SAFE-TS] listening on http://${host}:${port}`);
});