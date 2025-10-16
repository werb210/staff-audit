import { Request, Response, NextFunction } from "express";

interface AuthenticatedRequest extends Request {
  user?: {
    allowedSilos?: string[];
  };
  silo?: string;
}

export function silo(requiredSilo?: string) {
  return function(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    const user = req.user || {};
    const allowed = new Set(user.allowedSilos || ["BOREAL"]);
    const target = requiredSilo || (req.headers["x-silo"] as string) || "BOREAL";
    
    if (!allowed.has(target)) {
      return res.status(403).json({message: "Forbidden: silo"});
    }
    
    req.silo = target;
    next();
  };
}