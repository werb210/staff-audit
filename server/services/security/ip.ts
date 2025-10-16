function ipToNum(ip:string){
  // IPv4 only for CIDR; IPv6 handled as exact string
  const m = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (!m) return null;
  return (+m[1]<<24) + (+m[2]<<16) + (+m[3]<<8) + (+m[4]);
}

export function inCidr(ip:string, cidr:string){
  const [base, bitsStr] = cidr.split("/");
  const bits = Number(bitsStr||"32");
  const ipn = ipToNum(ip); const bn = ipToNum(base||"");
  if (ipn==null || bn==null) return false;
  const mask = bits===0 ? 0 : ~((1<<(32-bits))-1) >>> 0;
  return (ipn & mask) === (bn & mask);
}

export function parseIps(csv:string){
  return (csv||"").split(",").map(s=>s.trim()).filter(Boolean);
}

export function clientIp(req:any){
  const xf = String(req.headers["x-forwarded-for"]||"").split(",")[0].trim();
  return xf || (req.socket?.remoteAddress || req.ip || "") || "";
}