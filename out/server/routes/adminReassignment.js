// Document Reassignment API for Admin Users
import express from 'express';
import { db } from '../db';
import { documents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
const router = express.Router();
// Admin authentication middleware
async function requireAdmin(req, res, next) {
    try {
        // Get token from Authorization header or cookies
        const token = req.headers.authorization?.replace('Bearer ', '') ||
            req.cookies?.jwt ||
            req.cookies?.authToken;
        if (!token || token === 'test') {
            return res.status(401).json({
                success: false,
                error: 'Authentication required',
                message: 'Admin JWT token required for document reassignment'
            });
        }
        // Verify JWT token
        const JWT_SECRET = process.env.JWT_SECRET || 'development-secret-key';
        const decoded = jwt.verify(token, JWT_SECRET);
        // Check admin role
        if (decoded.role !== 'admin') {
            return res.status(403).json({
                success: false,
                error: 'Admin access required',
                message: 'Only administrators can reassign documents'
            });
        }
        req.admin = decoded;
        next();
    }
    catch (error) {
        console.error('❌ Admin auth error:', error);
        return res.status(401).json({
            success: false,
            error: 'Invalid authentication',
            message: 'Admin JWT token verification failed'
        });
    }
}
// Document reassignment endpoint  
router.post('/documents/reassign/:documentId', requireAdmin, async (req, res) => {
    try {
        const { documentId } = req.params;
        const { targetApplicationId } = req.body;
        if (!targetApplicationId) {
            return res.status(400).json({
                success: false,
                error: 'Missing target application ID',
                message: 'targetApplicationId is required in request body'
            });
        }
        // Validate UUID formats
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(documentId) || !uuidRegex.test(targetApplicationId)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid UUID format',
                message: 'Both documentId and targetApplicationId must be valid UUIDs'
            });
        }
        // Check if document exists
        const [document] = await db
            .select()
            .from(documents)
            .where(eq(documents.id, documentId))
            .limit(1);
        if (!document) {
            return res.status(404).json({
                success: false,
                error: 'Document not found',
                message: `Document ${documentId} does not exist`
            });
        }
        const originalApplicationId = document.applicationId;
        // Reassign document to target application
        await db
            .update(documents)
            .set({
            applicationId: targetApplicationId,
            updatedAt: new Date()
        })
            .where(eq(documents.id, documentId));
        // Log the reassignment
        console.log(`📄 [ADMIN REASSIGNMENT] Document ${documentId} moved from ${originalApplicationId} to ${targetApplicationId} by ${req.admin.email}`);
        return res.json({
            success: true,
            message: 'Document reassigned successfully',
            data: {
                documentId,
                originalApplicationId,
                newApplicationId: targetApplicationId,
                reassignedBy: req.admin.email,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('❌ Document reassignment error:', error);
        return res.status(500).json({
            success: false,
            error: 'Reassignment failed',
            message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error occurred'
        });
    }
});
// Get reassignment history endpoint
router.get('/documents/history/:applicationId', requireAdmin, async (req, res) => {
    try {
        const { applicationId } = req.params;
        // For now, return basic info since we don't have audit log table
        const documentsForApp = await db
            .select()
            .from(documents)
            .where(eq(documents.applicationId, applicationId));
        return res.json({
            success: true,
            applicationId,
            documentCount: documentsForApp.length,
            documents: documentsForApp.map(doc => ({
                id: doc.id,
                fileName: doc.fileName,
                documentType: doc.documentType,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
            }))
        });
    }
    catch (error) {
        console.error('❌ Reassignment history error:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch reassignment history'
        });
    }
});
// Test endpoint for diagnostic tests - must handle direct path matching
router.post('/documents/reassign/test', async (req, res) => {
    console.log('🧪 [ADMIN TEST] Document reassignment test endpoint called');
    res.status(403).json({
        success: false,
        error: 'Test endpoint - access denied',
        message: 'This is a test endpoint to verify API availability'
    });
});
export default router;
