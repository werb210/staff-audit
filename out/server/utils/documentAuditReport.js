import { db } from '../db';
import { applications, documents } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { checkDocumentAccessible } from './documentAccessibility';
/**
 * Run comprehensive audit across all applications
 * @returns Promise<ApplicationAuditResult[]>
 */
export async function runFullDocumentAudit() {
    console.log('🔍 Starting comprehensive document audit...');
    // Get all applications
    const allApplications = await db.select().from(applications);
    console.log(`📋 Found ${allApplications.length} applications to audit`);
    const auditResults = [];
    for (const app of allApplications) {
        console.log(`🔍 Auditing application: ${app.id} (${app.businessName || 'Unknown Business'})`);
        // Get all documents for this application
        const appDocuments = await db
            .select()
            .from(documents)
            .where(eq(documents.applicationId, app.id));
        console.log(`  📄 Found ${appDocuments.length} documents in database`);
        // Check accessibility of each document
        const accessibilityChecks = await Promise.all(appDocuments.map(async (doc) => {
            const isAccessible = await checkDocumentAccessible(doc.filePath, doc.applicationId, doc.fileName);
            return { ...doc, isAccessible };
        }));
        const accessibleDocs = accessibilityChecks.filter(doc => doc.isAccessible);
        const missingDocs = accessibilityChecks.filter(doc => !doc.isAccessible);
        console.log(`  ✅ ${accessibleDocs.length} files accessible, ❌ ${missingDocs.length} files missing`);
        auditResults.push({
            applicationId: app.id,
            businessName: app.businessName || 'Unknown Business',
            documentsInDB: appDocuments.length,
            filesOnDisk: accessibleDocs.length,
            missingFiles: missingDocs.length,
            accessibleDocuments: accessibleDocs.map(({ isAccessible, ...doc }) => doc),
            missingDocuments: missingDocs.map(({ isAccessible, ...doc }) => doc)
        });
    }
    // Summary statistics
    const totalDocuments = auditResults.reduce((sum, app) => sum + app.documentsInDB, 0);
    const totalAccessible = auditResults.reduce((sum, app) => sum + app.filesOnDisk, 0);
    const totalMissing = auditResults.reduce((sum, app) => sum + app.missingFiles, 0);
    console.log('\n📊 AUDIT SUMMARY:');
    console.log(`Total Documents in Database: ${totalDocuments}`);
    console.log(`Total Files Accessible: ${totalAccessible}`);
    console.log(`Total Files Missing: ${totalMissing}`);
    console.log(`Recovery Rate: ${totalDocuments > 0 ? Math.round((totalAccessible / totalDocuments) * 100) : 0}%`);
    return auditResults;
}
/**
 * Generate readable audit report
 */
export async function generateAuditReport() {
    const results = await runFullDocumentAudit();
    let report = '# Document System Audit Report\n\n';
    report += `Generated: ${new Date().toISOString()}\n\n`;
    // Summary table
    report += '## Summary\n\n';
    report += '| Application | Business Name | DB Records | Files Found | Missing | Recovery Rate |\n';
    report += '|-------------|---------------|------------|-------------|---------|---------------|\n';
    for (const app of results) {
        const recoveryRate = app.documentsInDB > 0
            ? Math.round((app.filesOnDisk / app.documentsInDB) * 100)
            : 0;
        report += `| ${app.applicationId.substring(0, 8)}... | ${app.businessName} | ${app.documentsInDB} | ${app.filesOnDisk} | ${app.missingFiles} | ${recoveryRate}% |\n`;
    }
    // Overall statistics
    const totalDocuments = results.reduce((sum, app) => sum + app.documentsInDB, 0);
    const totalAccessible = results.reduce((sum, app) => sum + app.filesOnDisk, 0);
    const totalMissing = results.reduce((sum, app) => sum + app.missingFiles, 0);
    const overallRecovery = totalDocuments > 0 ? Math.round((totalAccessible / totalDocuments) * 100) : 0;
    report += '\n## Overall Statistics\n\n';
    report += `- **Total Applications Audited**: ${results.length}\n`;
    report += `- **Total Documents in Database**: ${totalDocuments}\n`;
    report += `- **Total Files Accessible**: ${totalAccessible}\n`;
    report += `- **Total Files Missing**: ${totalMissing}\n`;
    report += `- **Overall Recovery Rate**: ${overallRecovery}%\n\n`;
    // Applications with missing files
    const appsWithMissing = results.filter(app => app.missingFiles > 0);
    if (appsWithMissing.length > 0) {
        report += '## Applications with Missing Files\n\n';
        for (const app of appsWithMissing) {
            report += `### ${app.businessName} (${app.applicationId})\n`;
            report += `Missing ${app.missingFiles} out of ${app.documentsInDB} documents:\n\n`;
            for (const doc of app.missingDocuments) {
                report += `- **${doc.fileName}** (${doc.documentType}) - Expected at: ${doc.filePath}\n`;
            }
            report += '\n';
        }
    }
    return report;
}
