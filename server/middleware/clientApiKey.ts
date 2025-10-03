import { Request, Response, NextFunction } from "express";

export function clientApiKeyAuth(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers["authorization"]?.replace("Bearer ", "").trim();
  const expectedKey = process.env.CLIENT_APP_API_KEY || "bf_client_7d9f4e1c9e7240a1b7f3d72a";
  
  console.log(`🔍 [CLIENT-AUTH] Received API key: ${apiKey ? 'provided' : 'missing'}`);
  console.log(`🔍 [CLIENT-AUTH] Expected API key: ${expectedKey ? 'configured' : 'missing'}`);
  
  if (!apiKey || apiKey !== expectedKey) {
    console.warn("🔒 Unauthorized client request - API key mismatch");
    return res.status(401).json({ ok: false, error: "Unauthorized" });
  }
  
  console.log("✅ [CLIENT-AUTH] API key verified successfully");
  next();
}