import express from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET || (() => {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('SESSION_SECRET environment variable is required in production');
      }
      return "dev-secret-key";
    })(),
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // Required for cross-origin
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Critical for cross-origin
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: express.Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // DISABLED: Login API endpoint (conflicts with server/auth/routes.ts)
  // The real login endpoint with database + SMS 2FA is in server/auth/routes.ts
  // app.post("/api/auth/login", async (req, res) => {
  //   ... (disabled to avoid conflicts)
  // });

  // DISABLED: Conflicting with devBypass - causes auth session failures  
  // Session check endpoint
  // app.get("/api/auth/session", (req, res) => {
  //   if ((req as any).session?.user?.claims?.sub) {
  //     res.json({ authenticated: true, user: (req as any).session.user });
  //   } else {
  //     res.status(401).json({ authenticated: false });
  //   }
  // });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true, message: "Logged out" });
    });
  });
}

export const isAuthenticated = async (req: any, res: any, next: any) => {
  // CLIENT API BYPASS: Always bypass authentication for client API routes (ALL ENVIRONMENTS)
  if (req.path && req.path.startsWith('/api/client/')) {
    console.log('🔓 [CLIENT-AUTH-BYPASS] Skipping authentication for client API route:', req.path);
    return next();
  }
  
  // Check if user is authenticated via session
  if (req.session?.user?.claims?.sub) {
    req.user = req.session.user;
    return next();
  }
  
  return res.status(401).json({ message: "Unauthorized" });
};