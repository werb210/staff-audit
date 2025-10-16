import { Router } from "express";

const router = Router();

/**
 * GET /api/csrf-token
 * Bootstrap CSRF protection by setting httpOnly cookie and echoing token in header
 */
router.get("/", (req: any, res: any) => {
  // Generate random CSRF token
  const token = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  
  // Set secure httpOnly cookie
  res.cookie("csrf", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  });
  
  // Echo token in response header for client access
  res.set("x-csrf-token", token);
  
  console.log(`✅ [CSRF] Token generated and set in cookie`);
  
  return res.json({ 
    ok: true,
    message: "CSRF token set in httpOnly cookie and x-csrf-token header"
  });
});

export default router;