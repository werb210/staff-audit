import crypto from "crypto";
import { users } from "./store";

export type TokenRecord = {
  id: string;
  userId: string;
  hash: string;          // sha256 of raw token
  createdAt: string;
  lastUsedAt?: string;
  active: boolean;
  name?: string;         // optional label (e.g., "Todd laptop")
};

// in-memory token table
export const tokens: Record<string, TokenRecord> = {};

export function randomToken(): string {
  // url-safe; prefix helps identify our tokens in logs
  return "bfk_" + crypto.randomBytes(32).toString("base64url");
}
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

// create + return raw token once
export function issueToken(userId: string, name?: string) {
  if (!users[userId]) throw new Error("user_not_found");
  const token = randomToken();
  const rec: TokenRecord = {
    id: "t_" + Date.now(),
    userId,
    hash: hashToken(token),
    createdAt: new Date().toISOString(),
    active: true,
    name,
  };
  tokens[rec.id] = rec;
  return { tokenId: rec.id, token }; // raw token only here
}

export function revokeToken(tokenId: string) {
  const t = tokens[tokenId];
  if (!t) return false;
  t.active = false;
  return true;
}

export function listUserTokens(userId: string): Omit<TokenRecord,"hash">[] {
  return Object.values(tokens)
    .filter(t => t.userId === userId)
    .map(({ hash, ...meta }) => meta)
    .sort((a,b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

export function findUserByToken(raw: string) {
  const h = hashToken(raw);
  const rec = Object.values(tokens).find(t => t.hash === h && t.active);
  if (!rec) return null;
  rec.lastUsedAt = new Date().toISOString();
  const u = users[rec.userId];
  if (!u || !u.active) return null;
  return u;
}