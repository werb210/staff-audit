import { test, expect } from "@playwright/test";

const START = process.env.PORTAL_URL || "http://localhost:5173/portal";
const MAX_ERROR_LOGS = 0; // fail on any console error
const SLOW_MS = 1500;

test("no console errors; no 4xx/5xx; no slow calls; no CORS blocks", async ({ page }) => {
  const logs:string[] = [];
  page.on("console", msg => { if (msg.type()==="error") logs.push(msg.text()); });
  const badRequests:string[] = [];
  page.on("response", async (res) => {
    const url = res.url();
    const status = res.status();
    if (status >= 400) badRequests.push(`${status} ${url}`);
    // Heuristic for CORS rejection content
    try { const ct = res.headers()["content-type"]||""; if (ct.includes("text/html")) {
      const body = await res.text();
      if (/CORS|Access-Control-Allow/i.test(body)) badRequests.push(`CORS? ${status} ${url}`);
    }} catch {}
  });

  await page.goto(START);
  await page.waitForLoadState("networkidle");

  // Simple slow call detector via perf entries
  const perf = await page.evaluate(() => performance.getEntriesByType("resource")
    .filter((e:any)=>e.initiatorType==="fetch" || e.initiatorType==="xmlhttprequest")
    .map((e:any)=>({name:e.name, dur:e.duration})));

  const slow = perf.filter((p:any)=>p.dur > SLOW_MS).map((p:any)=>`${Math.round(p.dur)}ms ${p.name}`);

  if (logs.length > MAX_ERROR_LOGS) {
    throw new Error("Console errors:\n" + logs.join("\n"));
  }
  expect(badRequests, "Network errors or CORS blocks").toHaveLength(0);
  expect(slow, "Slow API calls > 1.5s").toHaveLength(0);
});