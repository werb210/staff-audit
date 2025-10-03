import rateLimit from "express-rate-limit";
import { connection } from "../infra/queue";

export const smsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_SMS_PER_15M || 60),
  standardHeaders: true,
  legacyHeaders: false
});

export const emailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.RATE_EMAIL_PER_15M || 120),
  standardHeaders: true,
  legacyHeaders: false
});

// Redis-based per-target cooldown
export async function enforceCooldown(key: string, seconds: number) {
  if (!seconds) return;
  const k = `cooldown:${key}`;
  const exists = await connection.get(k);
  if (exists) throw new Error("Cooldown active");
  await connection.set(k, "1", "EX", seconds, "NX");
}