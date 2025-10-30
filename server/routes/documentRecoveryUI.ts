/**
 * 🔄 PHASE 4: DOCUMENT RECOVERY UI ROUTES
 * Staff interface for document recovery and re-upload
 */

import { Router } from 'express';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { documents, applications } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { enhancedUploadHandler } from '../utils/enhancedUploadHandler';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const dbSql = neon(process.env.DATABASE_URL!);
const db = drizzle(dbSql);
const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join(process.cwd(), 'uploads', 'documents');
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueId = uuidv4();
      const extension = path.extname(file.originalname);
      cb(null, `${uniqueId}${extension}`);
    }
  })
});

// Get application documents with missing file status
router.get('/application/:applicationId/documents', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    console.log(`🔄 [RECOVERY-UI] Fetching documents for application: ${applicationId}`);
    
    // Direct SQL query to avoid Drizzle ORM issues
    const sql = neon(process.env.DATABASE_URL!);
    
    // Get documents
    const documentsQuery = `
      SELECT id, applicationId, name, file_path, size, file_type, 
             document_type, createdAt, updatedAt, checksum, storage_key
      FROM documents 
      WHERE applicationId = $1
      ORDER BY createdAt DESC
    `;
    
    const docsResult = await sql(documentsQuery, [applicationId]);
    
    // Get application info  
    const appQuery = `
      SELECT business_name, email, status
      FROM applications 
      WHERE id = $1
    `;
    
    const appResult = await sql(appQuery, [applicationId]);
    const businessName = appResult[0]?.business_name || 'Unknown Business';
    
    console.log(`📊 [RECOVERY-UI] Found ${docsResult.length} documents for ${businessName}`);
    
    // Check each document's physical file status
    const documentsWithStatus = [];
    const fs = await import('fs/promises');
    
    for (const document of docsResult) {
      let physicalFileExists = false;
      let needsRecovery = false;
      
      if (document.file_path) {
        try {
          await fs.access(document.file_path);
          physicalFileExists = true;
          console.log(`✅ [RECOVERY-UI] File exists: ${document.name}`);
        } catch {
          needsRecovery = true;
          console.log(`❌ [RECOVERY-UI] File missing: ${document.name} at ${document.file_path}`);
        }
      } else {
        needsRecovery = true;
        console.log(`❌ [RECOVERY-UI] No file path for: ${document.name}`);
      }
      
      documentsWithStatus.push({
        id: document.id,
        fileName: document.name,
        filePath: document.file_path,
        fileSize: document.size,
        fileType: document.file_type,
        documentType: document.document_type,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        checksum: document.checksum,
        storageKey: document.storage_key,
        businessName,
        physicalFileExists,
        needsRecovery,
        isPlaceholder: !physicalFileExists && document.name?.includes('placeholder')
      });
    }
    
    const missingCount = documentsWithStatus.filter(d => d.needsRecovery).length;
    const healthyCount = documentsWithStatus.filter(d => d.physicalFileExists).length;
    
    console.log(`📈 [RECOVERY-UI] Status: ${healthyCount} healthy, ${missingCount} missing`);
    
    res.json({
      success: true,
      applicationId,
      businessName,
      documents: documentsWithStatus,
      totalDocuments: documentsWithStatus.length,
      missingFiles: missingCount,
      healthyFiles: healthyCount
    });
    
  } catch (error: unknown) {
    console.error('❌ [RECOVERY-UI] Error fetching documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch document status',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Re-upload document to replace missing/placeholder file
router.post('/document/:documentId/replace', upload.single('file'), async (req: any, res: any) => {
  try {
    const { documentId } = req.params;
    const { uploadedBy } = req.body;
    const file = req.file;
    
    if (!file) {
      return res.status(400).json({ error: 'No file provided for replacement' });
    }
    
    console.log(`🔄 [RECOVERY-UI] Starting document replacement for: ${documentId}`);
    
    // Get existing document info
    const existingDoc = await db
      .select()
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);
    
    if (existingDoc.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const doc = existingDoc[0];
    const originalFileName = doc.fileName;
    const applicationId = doc.applicationId;
    const documentType = doc.documentType;
    
    // Use enhanced upload handler to replace the file
    const result = await enhancedUploadHandler({
      file: {
        ...file,
        originalname: originalFileName || file.originalname // Preserve original name
      } as Express.Multer.File,
      applicationId,
      documentType: documentType || 'other',
      uploadedBy
    });
    
    if (!result.success) {
      console.error(`❌ [RECOVERY-UI] Replacement failed:`, result.error);
      return res.status(500).json({
        success: false,
        error: result.error,
        details: result
      });
    }
    
    // Update the original document record with new file info
    const fileExtension = file.originalname.split('.').pop();
    const newFilePath = `uploads/documents/${result.documentId}.${fileExtension}`;
    
    await db
      .update(documents)
      .set({
        filePath: newFilePath,
        fileSize: file.size,
        fileType: file.mimetype,
        updatedAt: new Date(),
        storageKey: `documents/${applicationId}/${result.documentId}.${fileExtension}`
      })
      .where(eq(documents.id, documentId));
    
    // Remove the temporary document created by enhanced handler
    if (result.documentId !== documentId) {
      await db
        .delete(documents)
        .where(eq(documents.id, result.documentId!));
    }
    
    console.log(`✅ [RECOVERY-UI] Document replacement successful: ${originalFileName}`);
    
    res.json({
      success: true,
      message: 'Document replacement completed successfully',
      documentId,
      originalFileName,
      newFileSize: file.size,
      validationPassed: result.validationDetails?.success || false
    });
    
  } catch (error: unknown) {
    console.error('❌ [RECOVERY-UI] Document replacement error:', error);
    res.status(500).json({
      success: false,
      error: 'Document replacement failed',
      message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

// Bulk recovery status check for multiple applications
router.post('/bulk-status', async (req: any, res: any) => {
  try {
    const { applicationIds } = req.body;
    
    if (!Array.isArray(applicationIds)) {
      return res.status(400).json({ error: 'applicationIds must be an array' });
    }
    
    const fs = await import('fs/promises');
    const bulkStatus = [];
    
    for (const appId of applicationIds) {
      const appDocs = await db
        .select()
        .from(documents)
        .where(eq(documents.applicationId, appId));
      
      let missingCount = 0;
      for (const doc of appDocs) {
        if (doc.filePath) {
          try {
            await fs.access(doc.filePath);
          } catch {
            missingCount++;
          }
        }
      }
      
      bulkStatus.push({
        applicationId: appId,
        totalDocuments: appDocs.length,
        missingDocuments: missingCount,
        needsRecovery: missingCount > 0,
        recoveryPriority: missingCount > 5 ? 'high' : missingCount > 2 ? 'medium' : 'low'
      });
    }
    
    res.json({
      success: true,
      applications: bulkStatus,
      summary: {
        totalApplications: applicationIds.length,
        applicationsNeedingRecovery: bulkStatus.filter(a => a.needsRecovery).length,
        totalMissingDocuments: bulkStatus.reduce((sum, a) => sum + a.missingDocuments, 0)
      }
    });
    
  } catch (error: unknown) {
    console.error('❌ [RECOVERY-UI] Bulk status check error:', error);
    res.status(500).json({
      success: false,
      error: 'Bulk status check failed'
    });
  }
});

export default router;