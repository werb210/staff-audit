import { pool } from '../db/connection';
import { promises as fs } from 'fs';
import path from 'path';

interface DocumentIntegrityReport {
  totalDocuments: number;
  missingFiles: Array<{
    id: string;
    fileName: string;
    filePath: string;
    applicationId: string;
    createdAt: string;
  }>;
  orphanedFiles: string[];
  summary: {
    documentsWithFiles: number;
    documentsWithoutFiles: number;
    filesWithoutDatabase: number;
  };
}

/**
 * Check document integrity and identify orphaned records/files
 */
export async function checkDocumentIntegrity(): Promise<DocumentIntegrityReport> {
  const report: DocumentIntegrityReport = {
    totalDocuments: 0,
    missingFiles: [],
    orphanedFiles: [],
    summary: {
      documentsWithFiles: 0,
      documentsWithoutFiles: 0,
      filesWithoutDatabase: 0
    }
  };

  try {
    // Get all documents from database
    const documentsQuery = `
      SELECT id, file_name, file_path, application_id, created_at 
      FROM documents 
      ORDER BY created_at DESC
    `;
    const documentsResult = await pool.query(documentsQuery);
    const documents = documentsResult.rows;
    
    report.totalDocuments = documents.length;

    // Check each document for file existence
    for (const doc of documents) {
      if (!doc.filePath) {
        report.missingFiles.push({
          id: doc.id,
          fileName: doc.fileName,
          filePath: 'NO_PATH_RECORDED',
          applicationId: doc.applicationId,
          createdAt: doc.createdAt
        });
        continue;
      }

      const fullPath = path.isAbsolute(doc.filePath) 
        ? doc.filePath 
        : path.join(process.cwd(), doc.filePath);

      try {
        await fs.access(fullPath);
        report.summary.documentsWithFiles++;
      } catch (error: unknown) {
        report.missingFiles.push({
          id: doc.id,
          fileName: doc.fileName,
          filePath: doc.filePath,
          applicationId: doc.applicationId,
          createdAt: doc.createdAt
        });
      }
    }

    report.summary.documentsWithoutFiles = report.missingFiles.length;

    // Check for orphaned files in uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads', 'documents');
    try {
      const files = await fs.readdir(uploadsDir);
      const dbFileNames = documents.map(d => path.basename(d.filePath || ''));
      
      for (const file of files) {
        if (!dbFileNames.includes(file)) {
          report.orphanedFiles.push(file);
        }
      }
      
      report.summary.filesWithoutDatabase = report.orphanedFiles.length;
    } catch (error: unknown) {
      console.log('Could not scan uploads directory:', error instanceof Error ? error.message : String(error));
    }

    return report;
  } catch (error: unknown) {
    console.error('Error checking document integrity:', error);
    throw error;
  }
}

/**
 * 🚨 DISABLED - DOCUMENT DELETION PROTECTION
 * Clean up orphaned document records (removes database entries for missing files)
 * Returns the number of records cleaned up
 */
export async function cleanupOrphanedDocumentRecords(): Promise<number> {
  console.error(`🚨 [DELETION BLOCKED] cleanupOrphanedDocumentRecords() called but BLOCKED by deletion protection`);
  console.error(`   POLICY: DOCUMENT_DELETION_LOCKED=true`);
  console.error(`   Contact system administrator for manual review`);
  
  // Log what would have been deleted for audit purposes
  const report = await checkDocumentIntegrity();
  if (report.missingFiles.length > 0) {
    console.log(`⚠️ [AUDIT] Would have deleted ${report.missingFiles.length} orphaned records:`);
    report.missingFiles.forEach(doc => {
      console.log(`   - ${doc.id}: ${doc.fileName} (App: ${doc.applicationId})`);
    });
  }
  
  return 0; // No deletions performed
}

/**
 * Get document integrity status for a specific application
 */
export async function getApplicationDocumentIntegrity(applicationId: string): Promise<DocumentIntegrityReport> {
  const report: DocumentIntegrityReport = {
    totalDocuments: 0,
    missingFiles: [],
    orphanedFiles: [],
    summary: {
      documentsWithFiles: 0,
      documentsWithoutFiles: 0,
      filesWithoutDatabase: 0
    }
  };

  try {
    const documentsQuery = `
      SELECT id, file_name, file_path, application_id, created_at 
      FROM documents 
      WHERE application_id = $1
      ORDER BY created_at DESC
    `;
    const documentsResult = await pool.query(documentsQuery, [applicationId]);
    const documents = documentsResult.rows;
    
    report.totalDocuments = documents.length;

    for (const doc of documents) {
      if (!doc.filePath) {
        report.missingFiles.push({
          id: doc.id,
          fileName: doc.fileName,
          filePath: 'NO_PATH_RECORDED',
          applicationId: doc.applicationId,
          createdAt: doc.createdAt
        });
        continue;
      }

      const fullPath = path.isAbsolute(doc.filePath) 
        ? doc.filePath 
        : path.join(process.cwd(), doc.filePath);

      try {
        await fs.access(fullPath);
        report.summary.documentsWithFiles++;
      } catch (error: unknown) {
        report.missingFiles.push({
          id: doc.id,
          fileName: doc.fileName,
          filePath: doc.filePath,
          applicationId: doc.applicationId,
          createdAt: doc.createdAt
        });
      }
    }

    report.summary.documentsWithoutFiles = report.missingFiles.length;
    return report;
  } catch (error: unknown) {
    console.error('Error checking application document integrity:', error);
    throw error;
  }
}