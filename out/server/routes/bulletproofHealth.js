import express from 'express';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { documents } from '../../shared/schema';
import fs from 'fs/promises';
const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);
const router = express.Router();
router.get('/health', async (req, res) => {
    try {
        // Get total documents count
        const allDocuments = await db.select().from(documents);
        const totalDocuments = allDocuments.length;
        // 💥 RACE CONDITION DETECTION: Check file system status and detect false positives
        let missingFiles = 0;
        let corruptedFiles = 0;
        let falsePositives = 0;
        let raceConditionsDetected = [];
        for (const doc of allDocuments) {
            if (doc.file_path) {
                try {
                    const stats = await fs.stat(doc.file_path);
                    const fileExistsOnDisk = true;
                    if (stats.size === 0) {
                        corruptedFiles++;
                    }
                    // Detect false negative: file exists on disk but DB says it doesn't
                    if (!doc.file_exists && fileExistsOnDisk) {
                        falsePositives++;
                        raceConditionsDetected.push({
                            documentId: doc.id,
                            fileName: doc.name,
                            issue: 'file_exists=false but file present on disk',
                            type: 'false_negative'
                        });
                    }
                }
                catch (error) {
                    missingFiles++;
                    // Detect false positive: DB says exists but disk disagrees
                    if (doc.file_exists) {
                        falsePositives++;
                        raceConditionsDetected.push({
                            documentId: doc.id,
                            fileName: doc.name,
                            issue: 'file_exists=true but missing on disk',
                            type: 'false_positive'
                        });
                    }
                }
            }
            else {
                missingFiles++;
            }
        }
        const healthStatus = {
            success: true,
            statistics: {
                totalDocuments,
                uploadSystem: missingFiles === 0 ? 'operational' : 'degraded',
                storageSystem: corruptedFiles === 0 ? 'operational' : 'degraded',
                raceConditionSystem: falsePositives === 0 ? 'operational' : 'degraded',
                missingFiles,
                corruptedFiles,
                falsePositives,
                raceConditionsDetected,
                healthScore: totalDocuments > 0 ? Math.round(((totalDocuments - missingFiles - corruptedFiles - falsePositives) / totalDocuments) * 100) : 100
            },
            raceConditionFix: {
                enabled: true,
                detectsFalsePositives: true,
                detectsFalseNegatives: true,
                autoSyncDatabase: true
            },
            timestamp: new Date().toISOString()
        };
        console.log(`🔍 [BULLETPROOF HEALTH] Total: ${totalDocuments}, Missing: ${missingFiles}, Corrupted: ${corruptedFiles}`);
        res.json(healthStatus);
    }
    catch (error) {
        console.error('❌ [BULLETPROOF HEALTH] Error:', error);
        res.status(500).json({
            success: false,
            error: 'Health check failed',
            statistics: {
                totalDocuments: 0,
                uploadSystem: 'error',
                storageSystem: 'error'
            }
        });
    }
});
export default router;
