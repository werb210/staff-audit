import crypto from "crypto";
export function newToken(n = 32) { return crypto.randomBytes(n).toString("hex"); }
export function hashToken(t) { return crypto.createHash("sha256").update("v1$" + t).digest("hex"); }
