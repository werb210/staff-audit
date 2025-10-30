/**
 * Twilio Admin Dashboard Logs - Feature 7
 * GET /api/twilio/logs - Table: SMS + Calls + OTP logs
 */
import { Router } from 'express';
const router = Router();
// In-memory logs storage (use database in production)
const communicationLogs = [
    {
        id: 'log_001',
        type: 'SMS',
        direction: 'outbound',
        from: '+17753146801',
        to: '+15551234567',
        message: 'Your loan application has been approved!',
        status: 'delivered',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        cost: 0.0075,
        sid: 'SM1234567890'
    },
    {
        id: 'log_002',
        type: 'SMS',
        direction: 'inbound',
        from: '+15551234567',
        to: '+17753146801',
        message: 'Thank you! When will I receive the funds?',
        status: 'received',
        timestamp: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), // 1.5 hours ago
        cost: 0,
        sid: 'SM1234567891'
    },
    {
        id: 'log_003',
        type: 'CALL',
        direction: 'outbound',
        from: '+17753146801',
        to: '+15551234567',
        duration: 142, // seconds
        status: 'completed',
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        cost: 0.02,
        sid: 'CA1234567890'
    },
    {
        id: 'log_004',
        type: 'OTP',
        direction: 'outbound',
        from: '+17753146801',
        to: '+15551234567',
        message: 'Your verification code is: 123456',
        status: 'delivered',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        cost: 0.0075,
        sid: 'SM1234567892',
        verified: true,
        attempts: 1
    },
    {
        id: 'log_005',
        type: 'SMS',
        direction: 'outbound',
        from: '+17753146801',
        to: '+15555678901',
        message: 'Reminder: Your appointment is tomorrow at 2 PM',
        status: 'delivered',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 minutes ago
        cost: 0.0075,
        sid: 'SM1234567893'
    }
];
// Feature 7: Get admin dashboard logs
router.get('/', async (req, res) => {
    try {
        const { type, limit = 50, offset = 0 } = req.query;
        let filteredLogs = [...communicationLogs];
        // Filter by type if specified
        if (type && type !== 'all') {
            filteredLogs = filteredLogs.filter(log => log.type.toLowerCase() === type.toLowerCase());
        }
        // Sort by timestamp (newest first)
        filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        // Apply pagination
        const startIndex = parseInt(offset);
        const endIndex = startIndex + parseInt(limit);
        const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
        // Calculate summary statistics
        const stats = {
            totalLogs: filteredLogs.length,
            smsCount: filteredLogs.filter(log => log.type === 'SMS').length,
            callCount: filteredLogs.filter(log => log.type === 'CALL').length,
            otpCount: filteredLogs.filter(log => log.type === 'OTP').length,
            totalCost: filteredLogs.reduce((sum, log) => sum + (log.cost || 0), 0),
            deliveredCount: filteredLogs.filter(log => log.status === 'delivered' || log.status === 'completed').length,
            failedCount: filteredLogs.filter(log => log.status === 'failed' || log.status === 'error').length
        };
        console.log('📊 Logs Retrieved:', {
            requestedType: type,
            totalReturned: paginatedLogs.length,
            stats
        });
        res.json({
            success: true,
            message: 'Communication logs retrieved successfully',
            data: {
                logs: paginatedLogs,
                pagination: {
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    total: filteredLogs.length,
                    hasMore: endIndex < filteredLogs.length
                },
                stats
            }
        });
    }
    catch (error) {
        console.error('❌ Logs Retrieval Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve logs',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// Get logs by type
router.get('/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const validTypes = ['sms', 'call', 'otp'];
        if (!validTypes.includes(type.toLowerCase())) {
            return res.status(400).json({
                success: false,
                error: 'Invalid log type. Valid types: sms, call, otp'
            });
        }
        const filteredLogs = communicationLogs.filter(log => log.type.toLowerCase() === type.toLowerCase());
        res.json({
            success: true,
            message: `${type.toUpperCase()} logs retrieved successfully`,
            data: {
                logs: filteredLogs,
                count: filteredLogs.length
            }
        });
    }
    catch (error) {
        console.error('❌ Type-specific Logs Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to retrieve type-specific logs',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
// Add new log entry (internal use)
router.post('/add', async (req, res) => {
    try {
        const logEntry = {
            id: `log_${Date.now()}`,
            timestamp: new Date().toISOString(),
            ...req.body
        };
        communicationLogs.push(logEntry);
        res.json({
            success: true,
            message: 'Log entry added successfully',
            data: logEntry
        });
    }
    catch (error) {
        console.error('❌ Add Log Error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to add log entry',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
