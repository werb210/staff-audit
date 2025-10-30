/**
 * Loan Decision SMS Notification Endpoints
 * Handles SMS notifications for loan approval, rejection, and funding decisions
 */
import { Router } from 'express';
import { db } from '../db';
import { applications } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { sendSMSNotification } from '../services/smsNotificationService';
const router = Router();
/**
 * POST /api/loan-decisions/:applicationId/approve
 * Send SMS notification for loan approval
 */
router.post('/:applicationId/approve', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { loanAmount, interestRate, terms, customMessage } = req.body;
        console.log(`💰 [LOAN-APPROVAL] Processing approval SMS for application ${applicationId}`);
        // Verify application exists
        const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        // Send SMS notification
        const smsResult = await sendSMSNotification({
            applicationId,
            trigger: 'loan_approved',
            customMessage,
            metadata: {
                loanAmount,
                interestRate,
                terms
            }
        });
        if (smsResult.success) {
            console.log(`✅ [LOAN-APPROVAL] SMS notification sent successfully for application ${applicationId}`);
            // Optionally update application status
            await db.update(applications)
                .set({
                stage: 'Approved',
                updatedAt: new Date()
            })
                .where(eq(applications.id, applicationId));
            res.json({
                success: true,
                message: 'Loan approval notification sent successfully',
                smsId: smsResult.smsId
            });
        }
        else {
            console.error(`❌ [LOAN-APPROVAL] Failed to send SMS: ${smsResult.error}`);
            res.status(500).json({
                success: false,
                error: 'Failed to send approval notification',
                details: smsResult.error
            });
        }
    }
    catch (error) {
        console.error('❌ [LOAN-APPROVAL] Error processing approval notification:', error);
        res.status(500).json({ error: 'Failed to process loan approval notification' });
    }
});
/**
 * POST /api/loan-decisions/:applicationId/reject
 * Send SMS notification for loan rejection
 */
router.post('/:applicationId/reject', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { reason, customMessage } = req.body;
        console.log(`❌ [LOAN-REJECTION] Processing rejection SMS for application ${applicationId}`);
        // Verify application exists
        const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        // Send SMS notification
        const smsResult = await sendSMSNotification({
            applicationId,
            trigger: 'loan_rejected',
            customMessage,
            metadata: {
                reason
            }
        });
        if (smsResult.success) {
            console.log(`✅ [LOAN-REJECTION] SMS notification sent successfully for application ${applicationId}`);
            // Optionally update application status
            await db.update(applications)
                .set({
                stage: 'Rejected',
                updatedAt: new Date()
            })
                .where(eq(applications.id, applicationId));
            res.json({
                success: true,
                message: 'Loan rejection notification sent successfully',
                smsId: smsResult.smsId
            });
        }
        else {
            console.error(`❌ [LOAN-REJECTION] Failed to send SMS: ${smsResult.error}`);
            res.status(500).json({
                success: false,
                error: 'Failed to send rejection notification',
                details: smsResult.error
            });
        }
    }
    catch (error) {
        console.error('❌ [LOAN-REJECTION] Error processing rejection notification:', error);
        res.status(500).json({ error: 'Failed to process loan rejection notification' });
    }
});
/**
 * POST /api/loan-decisions/:applicationId/funded
 * Send SMS notification for loan funding completion
 */
router.post('/:applicationId/funded', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { fundingAmount, disbursementMethod, expectedDate, customMessage } = req.body;
        console.log(`💸 [LOAN-FUNDING] Processing funding SMS for application ${applicationId}`);
        // Verify application exists
        const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        // Send SMS notification
        const smsResult = await sendSMSNotification({
            applicationId,
            trigger: 'loan_funded',
            customMessage,
            metadata: {
                fundingAmount,
                disbursementMethod,
                expectedDate
            }
        });
        if (smsResult.success) {
            console.log(`✅ [LOAN-FUNDING] SMS notification sent successfully for application ${applicationId}`);
            // Update application status to funded
            await db.update(applications)
                .set({
                stage: 'Funded',
                updatedAt: new Date()
            })
                .where(eq(applications.id, applicationId));
            res.json({
                success: true,
                message: 'Loan funding notification sent successfully',
                smsId: smsResult.smsId
            });
        }
        else {
            console.error(`❌ [LOAN-FUNDING] Failed to send SMS: ${smsResult.error}`);
            res.status(500).json({
                success: false,
                error: 'Failed to send funding notification',
                details: smsResult.error
            });
        }
    }
    catch (error) {
        console.error('❌ [LOAN-FUNDING] Error processing funding notification:', error);
        res.status(500).json({ error: 'Failed to process loan funding notification' });
    }
});
/**
 * POST /api/loan-decisions/:applicationId/custom
 * Send custom SMS notification for any loan-related communication
 */
router.post('/:applicationId/custom', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { message, trigger = 'custom_message' } = req.body;
        if (!message) {
            return res.status(400).json({ error: 'Message content is required' });
        }
        console.log(`📱 [CUSTOM-SMS] Sending custom message for application ${applicationId}`);
        // Verify application exists
        const [application] = await db.select().from(applications).where(eq(applications.id, applicationId));
        if (!application) {
            return res.status(404).json({ error: 'Application not found' });
        }
        // Send SMS notification
        const smsResult = await sendSMSNotification({
            applicationId,
            trigger: trigger,
            customMessage: message
        });
        if (smsResult.success) {
            console.log(`✅ [CUSTOM-SMS] Custom message sent successfully for application ${applicationId}`);
            res.json({
                success: true,
                message: 'Custom SMS notification sent successfully',
                smsId: smsResult.smsId
            });
        }
        else {
            console.error(`❌ [CUSTOM-SMS] Failed to send SMS: ${smsResult.error}`);
            res.status(500).json({
                success: false,
                error: 'Failed to send custom notification',
                details: smsResult.error
            });
        }
    }
    catch (error) {
        console.error('❌ [CUSTOM-SMS] Error sending custom message:', error);
        res.status(500).json({ error: 'Failed to send custom message' });
    }
});
export default router;
