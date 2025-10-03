import type { Request, Response, NextFunction, RequestHandler } from "express";
import cookieParser from "cookie-parser";
import session from "express-session";
import { randomUUID } from "crypto";

declare module "express-session" {
  interface SessionData {
    user?: { id: string; email: string; name?: string; role?: string };
  }
}

const isProd = process.env.NODE_ENV === "production";
const IN_REPLIT = !!process.env.REPL_ID || /replit/i.test(process.env.HOST || "") || /replit\.dev/.test(process.env.REPLIT_DOMAINS || "");

console.log(`🍪 Session config: isProd=${isProd}, IN_REPLIT=${IN_REPLIT}, REPL_ID=${!!process.env.REPL_ID}, HOST=${process.env.HOST}`);

export function sessionStack() {
  const secret = process.env.SESSION_SECRET;
  if (isProd && (!secret || secret === "dev_change_me")) {
    throw new Error("SESSION_SECRET must be set in production");
  }

  return [
    cookieParser(secret || "dev_change_me"),
    session({
      name: "__Host-staff.sid",
      secret: secret || "dev_change_me",
      resave: false,
      saveUninitialized: false,
      proxy: true, // critical with 'trust proxy'
      cookie: {
        path: "/",
        httpOnly: true,
        // key bit: inside iframe we MUST use None+Secure
        sameSite: IN_REPLIT ? "none" : "lax",
        secure: IN_REPLIT ? true : process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 8, // 8h
      },
    })
  ];
}

export function ensureAuth(req: Request, res: Response, next: NextFunction) {
  if (process.env.ALLOW_DEV_API === "1") return next(); // dev bypass
  if (req.session?.user) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

export async function loginUser(req: Request, user: {email:string; name?:string; role?:string}) {
  await new Promise<void>((resolve, reject) =>
    req.session.regenerate(err => (err ? reject(err) : resolve()))
  );
  req.session.user = { id: randomUUID(), email: user.email, name: user.name, role: user.role || "admin" };
  await new Promise<void>((resolve, reject) => req.session.save(err => (err ? reject(err) : resolve())));
}

export async function logoutUser(req: Request) {
  await new Promise<void>((resolve) => req.session.destroy(() => resolve()));
}