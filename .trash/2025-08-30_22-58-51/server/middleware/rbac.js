const ROLES = ['admin','user','marketing','lender'];

export function requireRole(...allowed) {
  return (req,res,next)=>{
    const role = req.user?.role;
    if (!role || !allowed.includes(role)) return res.status(403).json({ error:'Forbidden' });
    next();
  };
}

// For lender product CRUD: enforce ownership
export function requireLenderOwnership(req,res,next){
  if (req.user?.role !== 'lender') return next();
  const bodyLenderId = req.body?.lenderId || req.params?.lenderId;
  if (!bodyLenderId || bodyLenderId !== req.user.lenderId) {
    return res.status(403).json({ error:'Forbidden (ownProducts only)' });
  }
  next();
}