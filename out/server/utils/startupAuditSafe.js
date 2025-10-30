import fs from "fs";
import path from "path";
import { db } from "../db/drizzle";
import { documents } from "../db/schema";
export async function startupAuditSafe() {
    console.log("🧩 [STARTUP-AUDIT] Verifying document integrity...");
    const docs = await db.select().from(documents);
    const results = [];
    for (const doc of docs) {
        if (!doc.s3Key) {
            console.log(`❌ [STARTUP-AUDIT] MISSING S3 KEY: ${doc.name} (${doc.id})`);
            results.push({
                documentId: doc.id,
                documentName: doc.name || "Unknown",
                error: `Missing S3 key in record`,
            });
            continue;
        }
        const localPath = path.resolve("uploads/documents", doc.s3Key);
        const exists = fs.existsSync(localPath);
        if (!exists) {
            console.log(`❌ [STARTUP-AUDIT] MISSING: ${doc.name} (${doc.id})`);
            console.log(`   Expected path: ${localPath}`);
            results.push({
                documentId: doc.id,
                documentName: doc.name || "Unknown",
                error: `File missing on disk: ${localPath}`,
                expectedPath: localPath,
            });
        }
    }
    console.log(`✅ [STARTUP-AUDIT] Completed: ${results.length} issues found`);
    return results;
}
