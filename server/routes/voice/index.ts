import express from 'express';
import incomingRouter from './incoming';
import outgoingRouter from './outgoing';
import voicemailRouter from './voicemail';

const router = express.Router();

// Mount voice route handlers
router.use('/', incomingRouter);
router.use('/', outgoingRouter);
router.use('/', voicemailRouter);

export default router;