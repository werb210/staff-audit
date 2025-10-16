import crypto from "crypto";

export function enabled(){ return String(process.env.INTEGRATIONS_ENABLED||"false").toLowerCase()==="true"; }

export function maskPII(v:any){
  // shallow masker: obscures email/ssn/account numbers in objects/strings for logs
  const s = typeof v === "string" ? v : JSON.stringify(v||{});
  return s
    .replace(/([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/ig, "***@***")
    .replace(/\b(\d{3})[- ]?(\d{2})[- ]?(\d{4})\b/g, "***-**-****")
    .replace(/\b(\d{6,16})\b/g, m => m.length>=12 ? m.slice(0,2)+"***"+m.slice(-2) : "***");
}

export function verifyHmac(raw: string, signature: string, secret: string){
  if (!secret) return false;
  const h = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const norm = signature?.replace(/^sha256=/,"") || "";
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(norm));
}