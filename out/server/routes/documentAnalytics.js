// Feature 9: Document Analytics and Reporting Dashboard
import { Router } from "express";
import { db } from "../db.js";
import { documents, applications } from "../../shared/schema.js";
import { eq, gte, sql, desc } from "drizzle-orm";
const router = Router();
// Get comprehensive document analytics
router.get("/overview", async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query;
        // Calculate date range
        const now = new Date();
        const daysBack = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
        const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
        // Total documents
        const [totalDocs] = await db
            .select({ count: sql `count(*)` })
            .from(documents);
        // Documents in timeframe
        const [recentDocs] = await db
            .select({ count: sql `count(*)` })
            .from(documents)
            .where(gte(documents.createdAt, startDate));
        // Upload success rate
        // Upload stats temporarily disabled during schema migration
        const uploadStats = [];
        console.log('Upload stats disabled during schema migration');
        const totalUploads = uploadStats.reduce((sum, stat) => sum + stat.count, 0);
        const successfulUploads = uploadStats.find(s => s.status === 'success')?.count || 0;
        const successRate = totalUploads > 0 ? (successfulUploads / totalUploads) * 100 : 0;
        // Document types distribution
        const typeDistribution = await db
            .select({
            documentType: documents.documentType,
            count: sql `count(*)`
        })
            .from(documents)
            .where(gte(documents.createdAt, startDate))
            .groupBy(documents.documentType)
            .orderBy(desc(sql `count(*)`));
        // OCR processing stats
        const [ocrStats] = await db
            .select({
            processed: sql `count(*)`,
            avgConfidence: sql `avg(confidence)`
        })
            .from(ocrResults)
            .where(gte(ocrResults.processedAt, startDate));
        // Storage analytics
        const storageStats = await db
            .select({
            totalSize: sql `sum(size)`,
            avgSize: sql `avg(size)`,
            withBackup: sql `count(case when storage_key is not null then 1 end)`,
            withChecksum: sql `count(case when checksum is not null then 1 end)`
        })
            .from(documents);
        // Daily upload trends
        const dailyTrends = await db
            .select({
            date: sql `date(createdAt)`,
            uploads: sql `count(*)`
        })
            .from(documents)
            .where(gte(documents.createdAt, startDate))
            .groupBy(sql `date(createdAt)`)
            .orderBy(sql `date(createdAt)`);
        // Application completion rates
        const applicationStats = await db
            .select({
            status: applications.status,
            count: sql `count(*)`
        })
            .from(applications)
            .where(gte(applications.createdAt, startDate))
            .groupBy(applications.status);
        const analytics = {
            overview: {
                totalDocuments: totalDocs.count,
                recentDocuments: recentDocs.count,
                uploadSuccessRate: Math.round(successRate * 100) / 100,
                totalUploads,
                timeframe: `${daysBack} days`
            },
            storage: {
                totalSize: storageStats[0]?.totalSize || 0,
                averageSize: Math.round(storageStats[0]?.avgSize || 0),
                documentsWithBackup: storageStats[0]?.withBackup || 0,
                documentsWithChecksum: storageStats[0]?.withChecksum || 0,
                backupCoverage: totalDocs.count > 0
                    ? Math.round(((storageStats[0]?.withBackup || 0) / totalDocs.count) * 100)
                    : 0
            },
            processing: {
                ocrProcessed: ocrStats?.processed || 0,
                averageConfidence: Math.round((ocrStats?.avgConfidence || 0) * 100) / 100,
                processingRate: recentDocs.count > 0
                    ? Math.round(((ocrStats?.processed || 0) / recentDocs.count) * 100)
                    : 0
            },
            trends: {
                daily: dailyTrends,
                documentTypes: typeDistribution,
                uploadStatus: uploadStats
            },
            applications: {
                byStatus: applicationStats,
                completionRate: applicationStats.length > 0
                    ? Math.round(((applicationStats.find(s => s.status === 'submitted')?.count || 0) /
                        applicationStats.reduce((sum, s) => sum + s.count, 0)) * 100)
                    : 0
            }
        };
        res.json(analytics);
    }
    catch (error) {
        console.error("Error generating analytics:", error);
        res.status(500).json({ error: "Failed to generate analytics" });
    }
});
// Get detailed document metrics
router.get("/metrics", async (req, res) => {
    try {
        const { documentType, applicationId } = req.query;
        let query = db.select().from(documents);
        if (documentType) {
            query = query.where(eq(documents.documentType, documentType));
        }
        if (applicationId) {
            query = query.where(eq(documents.applicationId, applicationId));
        }
        const docs = await query;
        const metrics = {
            total: docs.length,
            bySize: {
                small: docs.filter(d => (d.fileSize || 0) < 1024 * 1024).length, // < 1MB
                medium: docs.filter(d => (d.fileSize || 0) >= 1024 * 1024 && (d.fileSize || 0) < 10 * 1024 * 1024).length, // 1-10MB
                large: docs.filter(d => (d.fileSize || 0) >= 10 * 1024 * 1024).length, // > 10MB
            },
            byStatus: {
                pending: docs.filter(d => d.status === 'pending').length,
                accepted: docs.filter(d => d.status === 'accepted').length,
                rejected: docs.filter(d => d.status === 'rejected').length,
            },
            byVerification: {
                verified: docs.filter(d => d.isVerified).length,
                unverified: docs.filter(d => !d.isVerified).length,
            },
            reliability: {
                withBackup: docs.filter(d => d.storage_key).length,
                withChecksum: docs.filter(d => d.checksum).length,
                fullySecure: docs.filter(d => d.storage_key && d.checksum).length,
            },
            averageSize: docs.length > 0
                ? Math.round(docs.reduce((sum, d) => sum + (d.fileSize || 0), 0) / docs.length)
                : 0,
            totalSize: docs.reduce((sum, d) => sum + (d.fileSize || 0), 0),
        };
        res.json(metrics);
    }
    catch (error) {
        console.error("Error generating metrics:", error);
        res.status(500).json({ error: "Failed to generate metrics" });
    }
});
// Export analytics data
router.get("/export", async (req, res) => {
    try {
        const { format = 'json', timeframe = '30d' } = req.query;
        const now = new Date();
        const daysBack = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
        const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
        // Get comprehensive data
        const docs = await db
            .select()
            .from(documents)
            .where(gte(documents.createdAt, startDate));
        // Upload logs temporarily disabled during schema migration
        const uploadLogs = [];
        console.log('Upload logs export disabled during schema migration');
        const exportData = {
            exportedAt: new Date().toISOString(),
            timeframe: `${daysBack} days`,
            documents: docs,
            uploadLogs,
            summary: {
                totalDocuments: docs.length,
                totalUploads: uploadLogs.length,
                successfulUploads: uploadLogs.filter(l => l.status === 'success').length,
                failedUploads: uploadLogs.filter(l => l.status === 'failed').length,
            }
        };
        if (format === 'csv') {
            // Convert to CSV format
            const csvRows = [
                ['Document ID', 'File Name', 'Type', 'Size', 'Status', 'Created At', 'Application ID'],
                ...docs.map(doc => [
                    doc.id,
                    doc.fileName,
                    doc.documentType,
                    doc.fileSize?.toString() || '0',
                    doc.status || 'pending',
                    doc.createdAt?.toISOString() || '',
                    doc.applicationId
                ])
            ];
            const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="document-analytics-${timeframe}.csv"`);
            res.send(csvContent);
        }
        else {
            // JSON format
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="document-analytics-${timeframe}.json"`);
            res.json(exportData);
        }
    }
    catch (error) {
        console.error("Error exporting analytics:", error);
        res.status(500).json({ error: "Failed to export analytics" });
    }
});
export default router;
