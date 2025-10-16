import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export function parseMoney(val: any) {
  if (val == null) return { cents: null, decimal: null, raw: null };
  const raw = String(val).trim();
  // Accept "$1,234.56" or "123456" cents-style
  const num = Number(raw.replace(/[^0-9.-]/g, ""));
  if (raw.match(/[,$.]/)) {
    const cents = Math.round(num * 100);
    return { cents, decimal: num, raw };
  } else {
    // likely cents
    const cents = Math.round(num);
    return { cents, decimal: cents / 100, raw };
  }
}

export function parseYear(s: any) { 
  const y = String(s).trim().slice(0, 4); 
  return /^\d{4}$/.test(y) ? `${y}-01-01` : null; 
}

export function parseYearMonth(s: any) {
  const m = String(s).trim().slice(0, 7); 
  return /^\d{4}-\d{2}$/.test(m) ? `${m}-01` : null;
}

export function parseDate(s: any) {
  const d = String(s).trim();
  const m = d.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) { 
    const [_, Y, M, D] = m; 
    return `${Y}-${String(M).padStart(2, "0")}-${String(D).padStart(2, "0")}`; 
  }
  return null;
}

// --- field-level encryption (AES-256-GCM) ---
const key = (() => {
  const env = process.env.PII_SECRET_KEY || "";
  if (env.startsWith("base64:")) return Buffer.from(env.replace("base64:", ""), "base64");
  if (env.length === 32) return Buffer.from(env, "utf8");
  
  // Development fallback - always enabled if PII_SECRET_KEY missing
  console.warn("[DEV] Using fallback PII encryption key - not for production!");
  return Buffer.from("dev-key-32chars-abcdefghijklmnop", "utf8");
  
  throw new Error("PII_SECRET_KEY missing/invalid");
})();

export function encryptPII(obj: any) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(obj), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from("01"), iv, tag, body]); // versioned blob
}

export function decryptPII(buf: Buffer) {
  const v = buf.subarray(0, 1).toString() === "01";
  const iv = buf.subarray(1, 13);
  const tag = buf.subarray(13, 29);
  const body = buf.subarray(29);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(body), decipher.final()]);
  return JSON.parse(out.toString("utf8"));
}