// server/auth/refreshStore.ts
const usedJti = new Set();
export function isRevoked(jti) { return usedJti.has(jti); }
export function revoke(jti) { usedJti.add(jti); }
