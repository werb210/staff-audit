// server/utils/jwt.ts
// ESM/CJS-safe shim for jsonwebtoken
import * as JWTLib from 'jsonwebtoken';
const jwt = JWTLib?.default ?? JWTLib;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('[BOOT][JWT] Missing JWT_SECRET');
    process.exit(1);
}
export function signAuthToken(payload, expiresIn = '12h') {
    return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn });
}
export function verifyAuthToken(token) {
    return jwt.verify(token, JWT_SECRET, {
        algorithms: ['HS256'],
        clockTolerance: 60,
    });
}
