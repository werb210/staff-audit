import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
const ACCESS_TTL = "15m"; // short-lived
const REFRESH_TTL = "7d"; // rotate on every use
const ISSUER = "bf-staff";
const AUDIENCE = "bf-staff-web";
const JWT_SECRET = process.env.JWT_SECRET || "bf_jwt_secret_key_development_32chars_long_minimum_secure";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "bf_refresh_secret_key_development_32chars_long_minimum_secure";
export function signAccessToken(user, amr = ["pwd"]) {
    const jti = randomUUID();
    const payload = { sub: user.id, email: user.email, roles: user.roles, orgId: user.orgId, amr, jti };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TTL, issuer: ISSUER, audience: AUDIENCE });
}
export function signRefreshToken(userId) {
    return jwt.sign({ sub: userId, jti: randomUUID() }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TTL, issuer: ISSUER, audience: AUDIENCE });
}
export function verifyAccess(token) {
    return jwt.verify(token, JWT_SECRET, { issuer: ISSUER, audience: AUDIENCE });
}
export function verifyRefresh(token) {
    return jwt.verify(token, JWT_REFRESH_SECRET, { issuer: ISSUER, audience: AUDIENCE });
}
function mustEnv(name) {
    const v = process.env[name];
    if (!v)
        throw new Error(`${name} must be set`);
    return v;
}
