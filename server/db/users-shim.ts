import crypto from "crypto";
type Role = "admin"|"manager"|"agent"|"lender"|"referrer";
export type User = { id:string; email:string; name?:string; role:Role; active:boolean; pwHash?:string; lenderId?:string };
type TokenRow = { id:string; type:"invite"|"reset"; email:string; role:Role; lenderId?:string; expiresAt:number; used:boolean };
const _users = new Map<string,User>();
const _tokens = new Map<string,TokenRow>();
const sha = (s:string)=>crypto.createHmac("sha256",process.env.HASH_SECRET||"h").update(s).digest("hex");
export const usersDb = {
  list(){ return Array.from(_users.values()); },
  getByEmail(email:string){ return Array.from(_users.values()).find(u=>u.email.toLowerCase()===email.toLowerCase())||null; },
  get(id:string){ return _users.get(id)||null; },
  create(u:User){ _users.set(u.id,u); return u; },
  update(id:string, patch:Partial<User>){ const u=_users.get(id); if(!u) return null; const n={...u,...patch}; _users.set(id,n); return n; },
  setPassword(id:string, pw:string){ const u=_users.get(id); if(!u) return null; u.pwHash=sha(pw); _users.set(id,u); return true; },
  verify(email:string, pw:string){ const u=this.getByEmail(email); return u && u.pwHash===sha(pw) ? u : null; },
  tokenCreate(t:TokenRow){ _tokens.set(t.id,t); return t; },
  tokenUse(id:string){ const t=_tokens.get(id); if(!t||t.used||Date.now()>t.expiresAt) return null; t.used=true; _tokens.set(id,t); return t; }
};
// seed an admin for safety
if (!usersDb.getByEmail("staff@boreal.financial")) usersDb.create({ id:"u-admin", email:"staff@boreal.financial", name:"Admin", role:"admin", active:true });