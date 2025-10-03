import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";

const ACCESS_TTL = "15m";            // short-lived
const REFRESH_TTL = "7d";            // rotate on every use
const ISSUER = "bf-staff";
const AUDIENCE = "bf-staff-web";

const JWT_SECRET = process.env.JWT_SECRET || "bf_jwt_secret_key_development_32chars_long_minimum_secure";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "bf_refresh_secret_key_development_32chars_long_minimum_secure";

export type JwtClaims = {
  sub: string;               // user id
  email: string;
  roles: string[];
  orgId?: string;
  amr?: string[];            // e.g., ["pwd"] or ["webauthn"]
  jti: string;
};

export function signAccessToken(user: {id:string,email:string,roles:string[],orgId?:string}, amr: string[] = ["pwd"]) {
  const jti = randomUUID();
  const payload: JwtClaims = { sub: user.id, email: user.email, roles: user.roles, orgId: user.orgId, amr, jti };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL, issuer: ISSUER, audience: AUDIENCE });
}

export function signRefreshToken(userId: string) {
  return jwt.sign({ sub: userId, jti: randomUUID() }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL, issuer: ISSUER, audience: AUDIENCE });
}

export function verifyAccess(token: string) {
  return jwt.verify(token, JWT_SECRET, { issuer: ISSUER, audience: AUDIENCE }) as JwtClaims;
}

export function verifyRefresh(token: string) {
  return jwt.verify(token, JWT_REFRESH_SECRET, { issuer: ISSUER, audience: AUDIENCE }) as { sub: string, jti: string };
}

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`${name} must be set`);
  return v;
}