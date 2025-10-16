// server/utils/jwt.ts
// ESM/CJS-safe shim for jsonwebtoken

import * as JWTLib from 'jsonwebtoken';

const jwt: typeof JWTLib = (JWTLib as any)?.default ?? (JWTLib as any);

const JWT_SECRET = process.env.JWT_SECRET!;
if (!JWT_SECRET) {
  console.error('[BOOT][JWT] Missing JWT_SECRET');
  process.exit(1);
}

export type TokenPayload = {
  userId: string;
  role: string;
  email: string;
  iat?: number;
  exp?: number;
};

export function signAuthToken(
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  expiresIn = '12h'
) {
  return jwt.sign(payload, JWT_SECRET, { algorithm: 'HS256', expiresIn } as any);
}

export function verifyAuthToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET, {
    algorithms: ['HS256'],
    clockTolerance: 60,
  }) as TokenPayload;
}