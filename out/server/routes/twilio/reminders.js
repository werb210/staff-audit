/**
 * Twilio Appointment Reminders - Feature 5
 * Background job via cron - POST /api/twilio/reminders/schedule
 */
import { Router } from 'express';
import twilio from 'twilio';
import cron from 'node-cron';
const router = Router();
// Initialize Twilio client
const twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
// In-memory reminder storage (use database in production)
const reminderStore = new Map();
// Feature 5: Schedule appointment reminder
router.post('/schedule', async (req, res) => {
    try {
        const { phoneNumber, message, scheduledTime } = req.body;
        if (!phoneNumber || !message || !scheduledTime) {
            return res.status(400).json({
                success: false,
                error: 'Missing required parameters: phoneNumber, message, scheduledTime'
            });
        }
        const reminderId = `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const scheduledDate = new Date(scheduledTime);
        // Validate scheduled time is in the future
        if (scheduledDate <= new Date()) {
            return res.status(400).json({
                success: false,
                error: 'Scheduled time must be in the future'
            });
        }
        // Store reminder
        reminderStore.set(reminderId, {
            phoneNumber,
            message,
            scheduledTime: scheduledDate,
            status: 'scheduled',
            createdAt: new Date()
        });
        // Schedule the reminder using node-cron
        const cronExpression = getCronExpression(scheduledDate);
        const task = cron.schedule(cronExpression, async () => {
            try {
                // Send reminder SMS
                const result = await twilioClient.messages.create({
                    body: message,
                    from: process.env.TWILIO_PHONE_NUMBER,
                    to: phoneNumber
                });
                console.log('⏰ Reminder Sent:', {
                    reminderId,
                    phoneNumber,
                    sid: result.sid,
                    status: result.status
                });
                // Update reminder status
                const reminder = reminderStore.get(reminderId);
                if (reminder) {
                    reminder.status = 'sent';
                    reminder.sentAt = new Date();
                    reminder.twilioSid = result.sid;
                }
                // Stop the cron job after execution
                task.stop();
            }
            catch (error) {
                console.error('❌ Reminder Send Error:', error);
                // Update reminder status to failed
                const reminder = reminderStore.get(reminderId);
                if (reminder) {
                    reminder.status = 'failed';
                    reminder.error = error instanceof Error ? error.message : String(error);
                }
            }
        }, {
            scheduled: true,
            timezone: "America/New_York"
        });
        console.log('📅 Reminder Scheduled:', {
            reminderId,
            phoneNumber,
            scheduledTime: scheduledDate,
            cronExpression
        });
        res.json({
            success: true,
            message: 'Appointment reminder scheduled successfully',
            data: {
                reminderId,
                phoneNumber,
                scheduledTime: scheduledDate,
                status: 'scheduled'
            }
        });
    }
    catch (error) {
        console.error('❌ Schedule Reminder Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to schedule reminder',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// Get scheduled reminders
router.get('/list', (req, res) => {
    try {
        const reminders = Array.from(reminderStore.entries()).map(([id, data]) => ({
            id,
            ...data
        }));
        res.json({
            success: true,
            data: reminders
        });
    }
    catch (error) {
        console.error('❌ List Reminders Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to list reminders',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// Cancel reminder
router.delete('/:reminderId', (req, res) => {
    try {
        const { reminderId } = req.params;
        if (reminderStore.has(reminderId)) {
            reminderStore.delete(reminderId);
            res.json({
                success: true,
                message: 'Reminder cancelled successfully'
            });
        }
        else {
            res.status(404).json({
                success: false,
                error: 'Reminder not found'
            });
        }
    }
    catch (error) {
        console.error('❌ Cancel Reminder Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to cancel reminder',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// Helper function to convert Date to cron expression
function getCronExpression(date) {
    const minute = date.getMinutes();
    const hour = date.getHours();
    const day = date.getDate();
    const month = date.getMonth() + 1;
    return `${minute} ${hour} ${day} ${month} *`;
}
export default router;
