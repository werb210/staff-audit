import express from 'express';
import rbacRouter from './rbac';
import usersRouter from './users';
import configRouter from './config';
import integrationsRouter from './integrations';

const router = express.Router();

// Mount sub-routes
router.use('/rbac', rbacRouter);
router.use('/users', usersRouter);
router.use('/config', configRouter);
router.use('/integrations', integrationsRouter);

export default router;