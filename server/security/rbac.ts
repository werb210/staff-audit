import { Request, Response, NextFunction } from "express";

export type Role = "admin" | "manager" | "agent" | "marketing" | "lender" | "referrer" | "viewer";

// Rank indicates privilege floor. Marketing == Agent.
const rank: Record<Role, number> = {
  admin: 5,
  manager: 4,
  marketing: 2,
  agent: 2,
  lender: 1,
  referrer: 1,
  viewer: 0
};

export function requireRole(min: Role | Role[]) {
  const needs = Array.isArray(min) ? min : [min];
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    // If no user is found, return 401 instead of defaulting to admin
    if (!user) {
      return res.status(401).json({ error: "authentication_required" });
    }
    
    const effective: Role = (user.roleEffective ?? user.role) as Role;
    const userRank = rank[effective] ?? -1;
    const ok = needs.some(r => {
      // If a specific role name is listed, allow exact match OR higher rank
      if (r in rank) return userRank >= (rank[r as Role] ?? 99);
      return false;
    });
    if (!ok) return res.status(403).json({ error: "forbidden", role: effective, required: needs });
    next();
  };
}

// Convenience: allow any of listed roles regardless of rank ordering
export function requireAnyRole(roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    
    // If no user is found, return 401 instead of defaulting to viewer
    if (!user) {
      return res.status(401).json({ error: "authentication_required" });
    }
    
    const effective: Role = (user.roleEffective ?? user.role) as Role;
    if (!roles.includes(effective)) {
      return res.status(403).json({ error: "forbidden", role: effective, required: roles });
    }
    next();
  };
}