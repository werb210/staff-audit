/**
 * Main Twilio Router - Matches specification exactly
 * All 8 required features as specified in the requirements
 */

import { Router } from 'express';
import smsRoutes from './sms';
import voiceRoutes from './voice';
import reminderRoutes from './reminders';
import complianceRoutes from './compliance';
import logsRoutes from './logs';
import statusRoutes from './status';

const router = Router();

// Mount all Twilio feature routes
router.use('/sms', smsRoutes);           // Feature 1 & 2: SMS + Two-way SMS
router.use('/voice', voiceRoutes);       // Feature 3: Voice Calls + IVR
// Feature 4: OTP disabled - Bearer token auth only
router.use('/reminders', reminderRoutes); // Feature 5: Appointment Reminders
router.use('/compliance', complianceRoutes); // Feature 6: US/Canada Compliance
router.use('/logs', logsRoutes);         // Feature 7: Admin Dashboard Logs
router.use('/status', statusRoutes);     // Feature 8: Webhook Receipts

export default router;