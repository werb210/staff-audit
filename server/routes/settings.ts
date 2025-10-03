import { Router } from "express";
import fs from "fs"; import path from "path";

// Import new settings sub-routes
import usersRouter from './settings/users';
import configRouter from './settings/config';
import integrationsRouter from './settings/integrations';

const r = Router();

// Mount new settings sub-routes
r.use('/users', usersRouter);
r.use('/config', configRouter);  
r.use('/integrations', integrationsRouter);

/** LEGACY SIMPLE USER ENDPOINTS - maintained for compatibility */
r.get("/legacy-users", (_req, res) => {
  res.json({ 
    ok: true, 
    users: [
      { id: "u1", name: "Admin User", email: "admin@example.com", role: "admin", active: true },
      { id: "u2", name: "Staff User", email: "staff@example.com", role: "agent", active: true },
      { id: "u3", name: "Marketing Lead", email: "marketing@example.com", role: "marketing", active: false }
    ]
  });
});

r.post("/invite", (req: any, res: any) => {
  const { email, role } = req.body;
  res.json({ ok: true, id: "new_" + Date.now(), email, role, active: true });
});

r.patch("/:id", (req: any, res: any) => {
  const { id } = req.params;
  const { role, active } = req.body;
  res.json({ ok: true, id, role, active });
});

/** SYSTEM STATS */
r.get("/system-stats", (_req, res) => {
  res.json({
    ok: true,
    systems: [
      { key: "dialer", label: "Twilio Dialer", status: "error" },
      { key: "storage", label: "Documents Storage", status: "ok" },
      { key: "email", label: "O365 Email", status: "warn" },
      { key: "database", label: "PostgreSQL Database", status: "ok" },
      { key: "auth", label: "Authentication", status: "ok" }
    ],
    quickActions: [
      { key: "inviteUser", label: "Invite User" },
      { key: "apiKeys", label: "Create API Key" },
      { key: "testDialer", label: "Test Dialer" },
      { key: "syncContacts", label: "Sync Contacts" }
    ],
    stats: {
      totalUsers: 3,
      activeUsers: 2,
      totalContacts: 29,
      activeIntegrations: 4
    }
  });
});

export default r;
