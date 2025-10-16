// server/auth/refreshStore.ts
const usedJti = new Set<string>();
export function isRevoked(jti: string) { return usedJti.has(jti); }
export function revoke(jti: string) { usedJti.add(jti); }