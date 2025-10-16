import { Router, Request, Response, NextFunction } from "express";

type Role = "admin"|"manager"|"ops"|"agent"|"read_only";
type User = {
  id: string;
  email: string;
  name?: string;
  roles: Role[];
  active: boolean;
  createdAt: string;
};

type Flags = Record<string, boolean>;
type Experiments = Record<string, { enabled: boolean; note?: string }>;

const users: User[] = [
  { id: "u_admin", email: "admin@example.com", name: "Admin One", roles: ["admin","manager"], active: true, createdAt: new Date().toISOString() },
  { id: "u_agent", email: "agent@example.com", name: "Agent A", roles: ["agent"], active: true, createdAt: new Date().toISOString() },
  { id: "u_ops",   email: "ops@example.com",   name: "Ops User",  roles: ["ops","read_only"], active: true, createdAt: new Date().toISOString() },
];

const flags: Flags = {
  pipelineDnd: true,
  commsCenter: true,
  lendersAdmin: true,
  strictAuth: false,
};

const experiments: Experiments = {
  "dashboard.cards.v2": { enabled: false, note: "New compact app card design" },
  "pipeline.lane.kpis": { enabled: true,  note: "Show counts + velocity per lane" },
};

function getRoles(req: Request): Role[] {
  // Dev helpers:
  // - Authorization: dev  OR Bearer dev  -> admin,manager,ops
  // - x-roles: "admin,manager"
  const auth = String(req.headers["authorization"] || "").toLowerCase();
  if (auth === "dev" || auth === "bearer dev") return ["admin","manager","ops"] as Role[];
  const hdr = String(req.headers["x-roles"] || "").trim();
  if (hdr) return hdr.split(",").map(s => s.trim()).filter(Boolean) as Role[];
  return []; // unauth by default
}

function requireAny(allowed: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = getRoles(req);
    if (r.some(x => allowed.includes(x))) return next();
    return res.status(403).json({ error: "forbidden", need: allowed });
  };
}

function id() { return Math.random().toString(36).slice(2, 10); }

export default function settingsMemRoutes() {
  const r = Router();

  // USERS
  r.get("/users", (_req, res) => {
    res.json(users);
  });

  r.post("/users", requireAny(["admin","manager"]), (req: any, res: any) => {
    const { email, name } = req.body || {};
    if (!email || typeof email !== "string") return res.status(400).json({ error: "email required" });
    if (users.some(u => u.email.toLowerCase() === String(email).toLowerCase()))
      return res.status(409).json({ error: "email exists" });
    const u: User = { id: "u_" + id(), email, name, roles: ["read_only"], active: true, createdAt: new Date().toISOString() };
    users.unshift(u);
    res.status(201).json(u);
  });

  r.patch("/users/:id", requireAny(["admin","manager"]), (req: any, res: any) => {
    const u = users.find(x => x.id === req.params.id);
    if (!u) return res.status(404).json({ error: "not found" });
    const { name, active, roles } = req.body || {};
    if (typeof name === "string") u.name = name;
    if (typeof active === "boolean") u.active = active;
    if (Array.isArray(roles)) {
      const clean = roles.filter(Boolean).map((x: string) => x.trim()).filter((x: string) =>
        ["admin","manager","ops","agent","read_only"].includes(x)
      ) as Role[];
      u.roles = Array.from(new Set(clean));
    }
    res.json(u);
  });

  r.delete("/users/:id", requireAny(["admin"]), (req: any, res: any) => {
    const i = users.findIndex(x => x.id === req.params.id);
    if (i < 0) return res.status(404).json({ error: "not found" });
    const [removed] = users.splice(i, 1);
    res.json({ ok: true, removed });
  });

  // FLAGS
  r.get("/flags", (_req, res) => {
    res.json(flags);
  });

  r.patch("/flags/:key", requireAny(["admin","manager"]), (req: any, res: any) => {
    const key = req.params.key;
    const val = req.body?.value;
    if (typeof val !== "boolean") return res.status(400).json({ error: "value must be boolean" });
    flags[key] = val;
    res.json({ key, value: val });
  });

  // EXPERIMENTS
  r.get("/experiments", (_req, res) => {
    res.json(experiments);
  });

  r.patch("/experiments/:key", requireAny(["admin","manager"]), (req: any, res: any) => {
    const key = req.params.key;
    const en = req.body?.enabled;
    if (typeof en !== "boolean") return res.status(400).json({ error: "enabled must be boolean" });
    if (!experiments[key]) experiments[key] = { enabled: en };
    else experiments[key].enabled = en;
    res.json({ key, enabled: en });
  });

  return r;
}
