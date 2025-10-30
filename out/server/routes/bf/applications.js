import express from 'express';
import { db } from '../../db';
import { applications, documents } from '../../../shared/schema';
import { eq, desc } from 'drizzle-orm';
const router = express.Router();
// Get BF-specific applications
router.get('/', async (req, res) => {
    try {
        console.log('📋 [BF-APPLICATIONS] Fetching BF applications');
        const result = await db
            .select({
            id: applications.id,
            firstName: applications.contactFirstName,
            lastName: applications.contactLastName,
            email: applications.contactEmail,
            phoneNumber: applications.contactPhone,
            businessName: applications.legalBusinessName,
            loanAmount: applications.loanAmount,
            loanPurpose: applications.useOfFunds,
            currentStage: applications.stage,
            status: applications.status,
            createdAt: applications.createdAt,
            updatedAt: applications.updatedAt
        })
            .from(applications)
            .orderBy(desc(applications.createdAt));
        console.log(`📋 [BF-APPLICATIONS] Found ${result.length} BF applications`);
        res.json({
            success: true,
            applications: result,
            count: result.length
        });
    }
    catch (error) {
        console.error('❌ [BF-APPLICATIONS] Error fetching BF applications:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch BF applications'
        });
    }
});
// Get specific BF application by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`📋 [BF-APPLICATIONS] Fetching BF application: ${id}`);
        const applicationResult = await db
            .select({
            id: applications.id,
            firstName: applications.contactFirstName,
            lastName: applications.contactLastName,
            email: applications.contactEmail,
            phoneNumber: applications.contactPhone,
            businessName: applications.legalBusinessName,
            loanAmount: applications.loanAmount,
            loanPurpose: applications.useOfFunds,
            currentStage: applications.stage,
            status: applications.status,
            createdAt: applications.createdAt,
            updatedAt: applications.updatedAt
        })
            .from(applications)
            .where(eq(applications.id, id));
        if (applicationResult.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'BF application not found'
            });
        }
        // Get related documents
        const documentsResult = await db
            .select({
            id: documents.id,
            filename: documents.fileName,
            documentType: documents.documentType,
            fileSize: documents.fileSize,
            createdAt: documents.createdAt
        })
            .from(documents)
            .where(eq(documents.applicationId, id))
            .orderBy(desc(documents.createdAt));
        const application = {
            ...applicationResult[0],
            documents: documentsResult
        };
        res.json({
            success: true,
            application
        });
    }
    catch (error) {
        console.error('❌ [BF-APPLICATIONS] Error fetching BF application:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch BF application'
        });
    }
});
export default router;
