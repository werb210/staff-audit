import { db } from '../db';
import { documents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
export async function repairMissingDocuments() {
    console.log('🔧 [DOCUMENT REPAIR] Starting comprehensive document repair...');
    try {
        // Get all documents from database
        const allDocuments = await db.select().from(documents);
        console.log(`📊 [DOCUMENT REPAIR] Found ${allDocuments.length} documents in database`);
        let repairedCount = 0;
        let deletedCount = 0;
        for (const doc of allDocuments) {
            const filePath = doc.filePath;
            if (!filePath) {
                console.log(`⚠️ [DOCUMENT REPAIR] Document ${doc.id} has no file path, skipping`);
                continue;
            }
            const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
            if (!fs.existsSync(fullPath)) {
                console.log(`❌ [DOCUMENT REPAIR] Missing file: ${doc.fileName} (${doc.id})`);
                // Try to find the file in uploads directory with same name
                const uploadsDir = path.join(process.cwd(), 'uploads');
                const foundFiles = await findFileRecursively(uploadsDir, doc.fileName || '');
                if (foundFiles.length > 0) {
                    // Found a matching file, update database
                    const newPath = path.relative(process.cwd(), foundFiles[0]);
                    await db
                        .update(documents)
                        .set({ filePath: newPath })
                        .where(eq(documents.id, doc.id));
                    console.log(`✅ [DOCUMENT REPAIR] Repaired: ${doc.fileName} -> ${newPath}`);
                    repairedCount++;
                }
                else {
                    // File not found anywhere, remove from database
                    await db
                        .delete(documents)
                        .where(eq(documents.id, doc.id));
                    console.log(`🗑️ [DOCUMENT REPAIR] Removed orphaned record: ${doc.fileName}`);
                    deletedCount++;
                }
            }
            else {
                console.log(`✅ [DOCUMENT REPAIR] File exists: ${doc.fileName}`);
            }
        }
        console.log(`🎉 [DOCUMENT REPAIR] Completed! Repaired: ${repairedCount}, Deleted: ${deletedCount}`);
        return { repairedCount, deletedCount };
    }
    catch (error) {
        console.error('❌ [DOCUMENT REPAIR] Error:', error);
        throw error;
    }
}
async function findFileRecursively(dir, fileName) {
    const results = [];
    try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                const subResults = await findFileRecursively(fullPath, fileName);
                results.push(...subResults);
            }
            else if (item === fileName) {
                results.push(fullPath);
            }
        }
    }
    catch (error) {
        // Directory doesn't exist or no permission, skip
    }
    return results;
}
export async function createMissingDirectories() {
    const dirs = [
        'uploads',
        'uploads/documents',
        'uploads/signed_applications',
        'uploads/bank_statements',
        'uploads/financials'
    ];
    for (const dir of dirs) {
        const fullPath = path.join(process.cwd(), dir);
        if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath, { recursive: true });
            console.log(`📁 [DOCUMENT REPAIR] Created directory: ${dir}`);
        }
    }
}
