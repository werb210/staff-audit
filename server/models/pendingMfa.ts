type Rec = { userId:string; pendingId:string; sentAt:number; used:boolean };
const store = new Map<string, Rec>(); // key=userId
const TTL_MS = 5*60*1000, COOLDOWN_MS = 60*1000;

export async function getOrCreatePending(userId:string, send:(code:string)=>Promise<void>) {
  const now = Date.now();
  const ex = store.get(userId);
  if (ex && !ex.used && now - ex.sentAt < TTL_MS) {
    if (now - ex.sentAt < COOLDOWN_MS) return ex;          // don't resend
    await send(codeFor(ex.pendingId)); ex.sentAt = now; return ex;
  }
  const pendingId = crypto.randomUUID();
  const rec = { userId, pendingId, sentAt: now, used: false };
  store.set(userId, rec);
  await send(codeFor(pendingId));
  return rec;
}
export function consumePending(pendingId:string){ for (const r of store.values()) if (r.pendingId===pendingId && !r.used && Date.now()-r.sentAt<TTL_MS){ r.used=true; return r.userId; } return null; }
function codeFor(p:string){ return (parseInt(p.replace(/\D/g,"").slice(-6)||"0",10)%1e6).toString().padStart(6,"0"); }