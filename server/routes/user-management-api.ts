import { Router } from 'express';

const router = Router();

// User management endpoint (fixing 404)
router.get('/', (_req, res) => {
  res.json({
    ok: true,
    users: [
      {
        id: 'u_admin',
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        active: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'u_agent',
        name: 'Agent User',
        email: 'agent@example.com',
        role: 'agent',
        active: true,
        createdAt: new Date().toISOString()
      }
    ],
    roles: ['admin', 'manager', 'ops', 'agent', 'read_only']
  });
});

export default router;