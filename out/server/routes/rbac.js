import { Router } from 'express';
const router = Router();
console.log('🔧 [RBAC] Loading RBAC router with all modules...');
// Import and use existing RBAC route modules  
import rbacAuthRouter from './rbacAuth';
import rbacUsersRouter from './rbacUsers';
import rbacLenderProductsRouter from './rbacLenderProducts';
console.log('🔧 [RBAC] All modules imported successfully');
// Add a test route to verify the router is working
router.get('/test', (req, res) => {
    console.log('🔧 [RBAC] Test route accessed');
    res.json({
        success: true,
        message: 'RBAC router is working',
        timestamp: new Date().toISOString()
    });
});
// Mount RBAC routes
router.use('/auth', rbacAuthRouter);
router.use('/users', rbacUsersRouter);
router.use('/lender-products', rbacLenderProductsRouter);
console.log('🔧 [RBAC] All routes mounted: /auth, /users, /lender-products, /test');
export default router;
