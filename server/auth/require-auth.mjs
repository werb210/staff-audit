import * as jose from "jose";

/** Reads token from Authorization: Bearer, or cookies: token/jwt/access_token */
function extractToken(req){
  const h = req.headers?.authorization || "";
  const m = /^Bearer\s+(.+)$/i.exec(h);
  if (m) return m[1];
  const c = req.headers?.cookie || "";
  const kv = Object.fromEntries(c.split(/;\s*/).map(s=>s.split("=").map(decodeURIComponent)).filter(a=>a.length===2));
  return kv.access_token || kv.token || kv.jwt || null;
}

/** Build a verifier from either JWKS (RS256) or shared secret (HS256). */
async function buildVerifier(){
  const jwks = process.env.AUTH_JWKS_URL;
  const secret = process.env.JWT_SECRET;
  if (jwks){
    const jwksUrl = new URL(jwks);
    const JWKS = jose.createRemoteJWKSet(jwksUrl);
    return async (tok)=> (await jose.jwtVerify(tok, JWKS)).payload;
  }
  if (secret){
    const key = new TextEncoder().encode(secret);
    return async (tok)=> (await jose.jwtVerify(tok, key)).payload;
  }
  throw Object.assign(new Error("No verifier configured"), { asks: [
    "Set AUTH_JWKS_URL (for RS256) or JWT_SECRET (for HS256).",
    "Ensure the browser sends Authorization: Bearer <token> or a 'token' cookie.",
  ]});
}

/** Require auth; returns 401 or 412 (asks) with details instead of "invalid_token". */
export function requireAuth(){
  let verifierPromise = null;
  return async function(req,res,next){
    try{
      verifierPromise = verifierPromise || buildVerifier();
      const verify = await verifierPromise;
      const token = extractToken(req);
      if (!token) return res.status(401).json({ error:"missing_token", asks:["Send Authorization: Bearer <token> or set 'token' cookie"]});
      const payload = await verify(token);
      req.user = payload;
      return next();
    }catch(e){
      if (e.asks) return res.status(412).json({ asks: e.asks });
      return res.status(401).json({ error:"invalid_token", detail:String(e.message||e) });
    }
  };
}

/** Optional: allow unauth in dev if DEV_NO_AUTH=1 (not used by default) */
export function optionalAuth(){
  let verifierPromise = null;
  return async function(req,_res,next){
    try{
      const token = extractToken(req);
      if (!token) return next();
      verifierPromise = verifierPromise || buildVerifier();
      const verify = await verifierPromise;
      req.user = (await verify(token));
    }catch{}
    next();
  };
}