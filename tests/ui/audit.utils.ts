import { Page } from "@playwright/test";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function startNetworkCapture(page: Page) {
  const logs: any[] = [];
  page.on("request", (r) => logs.push({ t: Date.now(), ty: "req", m: r.method(), u: r.url() }));
  page.on("response", (r) => logs.push({ t: Date.now(), ty: "res", s: r.status(), u: r.url() }));
  page.on("console", (msg) => logs.push({ t: Date.now(), ty: "log", lv: msg.type(), tx: msg.text() }));
  return logs;
}

export async function saveAudit(name: string, data: any) {
  const dir = "tests/artifacts/ui-audit";
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${name}.json`), JSON.stringify(data, null, 2));
}

export async function reportRow(page: string, control: string, status: string, details: any = {}) {
  return { page, control, status, ...details };
}

export async function getDialerModel(page: Page) {
  return await page.evaluate(() => (window as any).__dialer?.model || null);
}
