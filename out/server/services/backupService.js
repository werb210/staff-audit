import { db } from '../db';
import { applications, documents, documentBackups } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import archiver from 'archiver';
import path from 'path';
import fs from 'fs';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'ca-central-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'boreal-documents';
export class BackupService {
    // Create monthly snapshot for all applications
    async createMonthlySnapshot() {
        console.log('[BACKUP] Starting monthly snapshot process...');
        const startTime = Date.now();
        const month = new Date().toISOString().slice(0, 7); // YYYY-MM format
        try {
            // Get all applications
            const apps = await db.select().from(applications);
            console.log(`[BACKUP] Found ${apps.length} applications to backup`);
            let successCount = 0;
            let failureCount = 0;
            for (const app of apps) {
                try {
                    await this.createApplicationSnapshot(app.id, month);
                    successCount++;
                    console.log(`[BACKUP] ✅ Completed backup for application ${app.id}`);
                }
                catch (error) {
                    failureCount++;
                    console.error(`[BACKUP] ❌ Failed to backup application ${app.id}:`, error);
                }
            }
            const duration = Date.now() - startTime;
            console.log(`[BACKUP] Monthly snapshot completed: ${successCount} success, ${failureCount} failures in ${duration}ms`);
            // Record overall backup summary
            await this.recordBackupSummary(month, successCount, failureCount, duration);
        }
        catch (error) {
            console.error('[BACKUP] Monthly snapshot process failed:', error);
            throw error;
        }
    }
    // Create snapshot for a single application
    async createApplicationSnapshot(applicationId, month) {
        try {
            // Get application documents
            const docs = await db
                .select()
                .from(documents)
                .where(eq(documents.applicationId, applicationId));
            if (docs.length === 0) {
                console.log(`[BACKUP] No documents found for application ${applicationId}, skipping`);
                return '';
            }
            // Create ZIP file
            const zipPath = await this.createZipFile(applicationId, docs);
            // Upload to S3
            const s3Key = `snapshots/${month}/${applicationId}.zip`;
            const s3Url = await this.uploadToS3(zipPath, s3Key);
            // Calculate file size
            const stats = fs.statSync(zipPath);
            const fileSizeMb = Math.round(stats.size / (1024 * 1024));
            // Record backup in database
            await db.insert(documentBackups).values({
                backupDate: new Date(),
                documentsCount: docs.length,
                backupSizeMb: fileSizeMb,
                s3Location: s3Url,
                status: 'completed'
            });
            // Clean up local ZIP file
            fs.unlinkSync(zipPath);
            console.log(`[BACKUP] Application ${applicationId}: ${docs.length} documents, ${fileSizeMb}MB uploaded to ${s3Key}`);
            return s3Url;
        }
        catch (error) {
            console.error(`[BACKUP] Failed to create snapshot for application ${applicationId}:`, error);
            // Record failed backup
            await db.insert(documentBackups).values({
                backupDate: new Date(),
                documentsCount: 0,
                status: 'failed',
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });
            throw error;
        }
    }
    // Create ZIP file containing all documents for an application
    async createZipFile(applicationId, docs) {
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }
        const zipPath = path.join(tempDir, `${applicationId}-${Date.now()}.zip`);
        const output = fs.createWriteStream(zipPath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        return new Promise((resolve, reject) => {
            output.on('close', () => {
                console.log(`[BACKUP] ZIP created: ${archive.pointer()} bytes`);
                resolve(zipPath);
            });
            archive.on('error', (err) => {
                reject(err);
            });
            archive.pipe(output);
            // Add each document to the ZIP
            for (const doc of docs) {
                try {
                    const filePath = doc.filePath || doc.storageKey;
                    if (filePath && fs.existsSync(filePath)) {
                        archive.file(filePath, {
                            name: `${doc.documentType}/${doc.fileName}`,
                            date: new Date(doc.createdAt)
                        });
                    }
                    else {
                        // Add metadata file if physical file is missing
                        const metadata = {
                            id: doc.id,
                            fileName: doc.fileName,
                            documentType: doc.documentType,
                            fileSize: doc.fileSize,
                            uploadedBy: doc.uploadedBy,
                            createdAt: doc.createdAt,
                            status: 'FILE_MISSING'
                        };
                        archive.append(JSON.stringify(metadata, null, 2), {
                            name: `${doc.documentType}/${doc.fileName}.metadata.json`
                        });
                    }
                }
                catch (fileError) {
                    console.warn(`[BACKUP] Could not add file ${doc.fileName}:`, fileError);
                }
            }
            // Add application summary
            const summary = {
                applicationId,
                backupDate: new Date().toISOString(),
                documentCount: docs.length,
                documents: docs.map(d => ({
                    id: d.id,
                    fileName: d.fileName,
                    documentType: d.documentType,
                    fileSize: d.fileSize,
                    createdAt: d.createdAt
                }))
            };
            archive.append(JSON.stringify(summary, null, 2), { name: 'backup-manifest.json' });
            archive.finalize();
        });
    }
    // Upload ZIP file to S3
    async uploadToS3(filePath, s3Key) {
        try {
            const fileContent = fs.readFileSync(filePath);
            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: s3Key,
                Body: fileContent,
                ContentType: 'application/zip',
                ServerSideEncryption: 'AES256',
                Metadata: {
                    'backup-type': 'monthly-snapshot',
                    'created-at': new Date().toISOString()
                }
            });
            await s3Client.send(command);
            const s3Url = `s3://${BUCKET_NAME}/${s3Key}`;
            console.log(`[BACKUP] Uploaded to S3: ${s3Url}`);
            return s3Url;
        }
        catch (error) {
            console.error(`[BACKUP] S3 upload failed for ${s3Key}:`, error);
            throw error;
        }
    }
    // Record backup summary for audit purposes
    async recordBackupSummary(month, successCount, failureCount, duration) {
        try {
            await db.insert(documentBackups).values({
                backupDate: new Date(),
                documentsCount: successCount,
                backupSizeMb: 0, // Summary record
                s3Location: `snapshots/${month}/`,
                status: failureCount === 0 ? 'completed' : 'partial',
                errorMessage: failureCount > 0 ? `${failureCount} applications failed to backup` : undefined
            });
        }
        catch (error) {
            console.error('[BACKUP] Failed to record backup summary:', error);
        }
    }
    // Get backup history for admin dashboard
    async getBackupHistory(limit = 30) {
        try {
            const backups = await db
                .select()
                .from(documentBackups)
                .orderBy(documentBackups.backupDate)
                .limit(limit);
            return backups.map(backup => ({
                id: backup.id,
                backupDate: backup.backupDate,
                documentsCount: backup.documentsCount,
                backupSizeMb: backup.backupSizeMb,
                s3Location: backup.s3Location,
                status: backup.status,
                errorMessage: backup.errorMessage,
                createdAt: backup.createdAt,
                completedAt: backup.completedAt
            }));
        }
        catch (error) {
            console.error('[BACKUP] Failed to fetch backup history:', error);
            return [];
        }
    }
    // Manual backup trigger for admin
    async triggerManualBackup(applicationId) {
        try {
            const month = new Date().toISOString().slice(0, 7);
            if (applicationId) {
                // Backup single application
                const s3Url = await this.createApplicationSnapshot(applicationId, `manual-${month}`);
                return {
                    success: true,
                    message: `Manual backup completed for application ${applicationId}. Uploaded to: ${s3Url}`
                };
            }
            else {
                // Backup all applications
                await this.createMonthlySnapshot();
                return {
                    success: true,
                    message: 'Manual backup completed for all applications'
                };
            }
        }
        catch (error) {
            return {
                success: false,
                message: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }
}
export const backupService = new BackupService();
