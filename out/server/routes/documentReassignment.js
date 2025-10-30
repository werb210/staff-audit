import express from 'express';
import { db } from '../db';
import { documents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
const router = express.Router();
/**
 * Admin Document Reassignment API
 * Allows administrators to reassign documents between applications
 */
router.post('/reassign', async (req, res) => {
    try {
        console.log(`🔄 [DOC-REASSIGN] Admin reassignment request received`);
        // Verify admin authentication
        const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Authentication token required for document reassignment'
            });
        }
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        }
        catch (jwtError) {
            return res.status(401).json({
                success: false,
                error: 'Invalid authentication token'
            });
        }
        // Verify admin role
        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin role required for document reassignment'
            });
        }
        const { documentIds, targetApplicationId, reason } = req.body;
        if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Document IDs array is required'
            });
        }
        if (!targetApplicationId) {
            return res.status(400).json({
                success: false,
                error: 'Target application ID is required'
            });
        }
        console.log(`🔄 [DOC-REASSIGN] Admin ${decoded.email} reassigning ${documentIds.length} documents to ${targetApplicationId}`);
        console.log(`🔄 [DOC-REASSIGN] Reason: ${reason || 'No reason provided'}`);
        // Update document assignments
        let reassignedCount = 0;
        for (const documentId of documentIds) {
            try {
                const result = await db
                    .update(documents)
                    .set({
                    applicationId: targetApplicationId,
                    updatedAt: new Date()
                })
                    .where(eq(documents.id, documentId));
                reassignedCount++;
                console.log(`✅ [DOC-REASSIGN] Document ${documentId} reassigned successfully`);
            }
            catch (error) {
                console.error(`❌ [DOC-REASSIGN] Failed to reassign document ${documentId}:`, error);
            }
        }
        // Log the reassignment for audit trail
        console.log(`📋 [DOC-REASSIGN] AUDIT: Admin ${decoded.email} reassigned ${reassignedCount}/${documentIds.length} documents to application ${targetApplicationId} - Reason: ${reason || 'Not specified'}`);
        res.json({
            success: true,
            message: `Successfully reassigned ${reassignedCount} documents`,
            reassignedCount,
            targetApplicationId,
            reason,
            adminEmail: decoded.email,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ [DOC-REASSIGN] Reassignment error:', error);
        res.status(500).json({
            success: false,
            error: 'Document reassignment failed',
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default router;
