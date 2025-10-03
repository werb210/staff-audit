export function authBearer(req, res, next) {
  const h = req.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  // TODO: verify JWT; attach req.user = { id, role, lenderId?, tenant }
  // For now, use the shared token approach but expect proper JWT verification
  const CLIENT_APP_SHARED_TOKEN = process.env.CLIENT_APP_SHARED_TOKEN;
  
  if (token === CLIENT_APP_SHARED_TOKEN) {
    // Set default admin user for shared token
    req.user = {
      id: '44444444-4444-4444-4444-444444444444',
      role: 'admin',
      tenant: 'bf'
    };
    return next();
  }
  
  // Keep cookie read-only if present, but outbound calls always use Bearer.
  return res.status(401).json({ error: 'Unauthorized' });
}