/**
 * 🔗 PUBLIC APPLICATIONS DOCUMENT UPLOAD ROUTE
 * 
 * Implements the missing /api/public/applications/:id/documents endpoint
 * with proper Azure integration and database persistence
 */

import { Router } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Configure multer for Azure upload (memory storage)
const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'text/plain',
      'application/octet-stream' // Allow generic binary files (includes PDFs that don't detect properly)
    ];
    
    console.log(`[UPLOAD] File MIME type: ${file.mimetype}, Original name: ${file.originalname}`);
    
    // Allow by file extension if MIME type detection fails
    const fileExtension = file.originalname.toLowerCase().split('.').pop();
    const allowedExtensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'tiff', 'txt'];
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension || '')) {
      cb(null, true);
    } else {
      console.log(`[UPLOAD] Rejected file: ${file.originalname}, MIME: ${file.mimetype}, Extension: ${fileExtension}`);
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
}).single('document');

// POST /api/public/applications/:id/documents - Document Upload with Azure
router.post('/:id/documents', uploadMiddleware, async (req: any, res: any) => {
  const { id: applicationId } = req.params;
  const { documentType } = req.body;
  const file = req.file;
  
  try {
    console.log(`[UPLOAD] Received document for application ${applicationId}`);
    console.log(`[UPLOAD] File: ${file?.originalname}, Type: ${documentType}, Size: ${file?.size} bytes`);
    
    // Validate required fields
    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        code: 'MISSING_FILE'
      });
    }
    
    if (!documentType) {
      return res.status(400).json({
        success: false,
        error: 'Document type is required',
        code: 'MISSING_DOCUMENT_TYPE'
      });
    }
    
    // Validate application ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(applicationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid application ID format',
        code: 'INVALID_APPLICATION_ID'
      });
    }
    
    // Check if application exists and get current status
    const { db } = await import('../../db.js');
    const { applications, documents } = await import('../../../shared/schema.js');
    const { eq, sql } = await import('drizzle-orm');
    
    const appResult = await db.execute(sql`
      SELECT 
        a.id, a.status, a.stage,
        COUNT(d.id) as current_document_count
      FROM applications a
      LEFT JOIN documents d ON d.applicationId = a.id
      WHERE a.id = ${applicationId}
      GROUP BY a.id, a.status, a.stage
      LIMIT 1
    `);
    
    const application = appResult.rows[0];
    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found',
        code: 'APPLICATION_NOT_FOUND'
      });
    }
    
    // Generate document ID and storage key
    const documentId = uuidv4();
    const fileExtension = file.originalname.split('.').pop() || 'pdf';
    const storageKey = `${applicationId}/${documentId}.${fileExtension}`;
    
    console.log(`[UPLOAD] Generated storage key: ${storageKey}`);
    
    // Upload to Azure
    const { uploadToAzure } = await import('../../config/s3Config.js');
    
    try {
      const s3StorageKey = await uploadToAzure(
        file.buffer,
        file.originalname,
        file.mimetype,
        applicationId
      );
      
      console.log(`[UPLOAD] Azure upload successful: ${s3StorageKey}`);
      
      // Calculate checksum
      const crypto = await import('crypto');
      const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
      
      // Save to database using parameterized queries for security
      const insertQuery = sql`
        INSERT INTO documents (
          id, 
          applicationId, 
          name, 
          document_type, 
          storage_key, 
          checksum, 
          size, 
          mime_type
        ) VALUES (
          ${documentId},
          ${applicationId},
          ${file.originalname},
          ${documentType},
          ${s3StorageKey},
          ${checksum},
          ${file.size},
          ${file.mimetype}
        ) RETURNING id
      `;
      
      const result = await db.execute(insertQuery);
      console.log(`[UPLOAD] Database record created: ${documentId}`);
      
      // Log successful upload
      console.log(`✅ [UPLOAD] Document uploaded successfully:
        - Application: ${applicationId}
        - Document ID: ${documentId}
        - File: ${file.originalname}
        - Type: ${documentType}
        - Size: ${file.size} bytes
        - Azure Key: ${s3StorageKey}
        - Checksum: ${checksum}`);

      // 🚀 PIPELINE AUTOMATION: Check if all required documents are now uploaded
      const newDocumentCount = parseInt(application.current_document_count || '0') + 1;
      const requiredDocuments = 2; // Minimum required documents
      let pipelineTransition = null;

      console.log(`📊 [PIPELINE-AUTOMATION] Document count after upload: ${newDocumentCount}/${requiredDocuments}`);

      // If application is in "Requires Docs" stage and we now have sufficient documents
      if (application.stage === 'Requires Docs' && newDocumentCount >= requiredDocuments) {
        try {
          console.log(`🔄 [PIPELINE-AUTOMATION] Triggering stage transition for application ${applicationId}`);
          
          // Update application stage to "In Review"
          await db.execute(sql`
            UPDATE applications 
            SET 
              status = 'submitted',
              stage = 'In Review',
              documents_status = 'complete',
              updatedAt = NOW()
            WHERE id = ${applicationId}
          `);

          pipelineTransition = {
            from: application.stage,
            to: 'In Review',
            reason: 'ALL_REQUIRED_DOCUMENTS_UPLOADED',
            documentCount: newDocumentCount
          };

          console.log(`✅ [PIPELINE-AUTOMATION] Application ${applicationId} moved to "In Review" stage`);

        } catch (transitionError) {
          console.error(`❌ [PIPELINE-AUTOMATION] Failed to transition application:`, transitionError);
          // Don't fail the upload if transition fails
        }
      }
      
      // Return success response with pipeline information
      res.status(200).json({
        success: true,
        documentId: documentId,
        fileName: file.originalname,
        documentType: documentType,
        fileSize: file.size,
        storageKey: s3StorageKey,
        checksum: checksum,
        pipeline: {
          currentStage: pipelineTransition?.to || application.stage,
          documentCount: newDocumentCount,
          requiredDocuments: requiredDocuments,
          transition: pipelineTransition
        },
        message: pipelineTransition 
          ? `Document uploaded successfully - Application moved to ${pipelineTransition.to}`
          : 'Document uploaded successfully'
      });
      
    } catch (s3Error: any) {
      console.error(`❌ [UPLOAD] Azure upload failed:`, s3Error);
      res.status(500).json({
        success: false,
        error: 'Azure upload failed',
        details: s3Error.message,
        code: 'Azure_UPLOAD_ERROR'
      });
    }
    
  } catch (error: any) {
    console.error(`❌ [UPLOAD] Upload error:`, error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error),
      code: 'SERVER_ERROR'
    });
  }
});

// GET /api/public/applications/:id/documents - List documents for application
router.get('/:id/documents', async (req: any, res: any) => {
  const { id: applicationId } = req.params;
  
  try {
    console.log(`[DOCUMENTS] Listing documents for application ${applicationId}`);
    
    // Validate application ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(applicationId)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid application ID format',
        code: 'INVALID_APPLICATION_ID'
      });
    }
    
    // Get documents from database
    const { db } = await import('../../db.js');
    const { documents } = await import('../../../shared/schema.js');
    const { eq } = await import('drizzle-orm');
    
    const docs = await db
      .select({
        id: documents.id,
        documentType: documents.documentType,
        fileName: documents.fileName,
        fileSize: documents.fileSize,
        storageKey: documents.storage_key,
        uploadedAt: documents.uploadedAt,
        checksum: documents.checksum
      })
      .from(documents)
      .where(eq(documents.applicationId, applicationId));
    
    console.log(`[DOCUMENTS] Found ${docs.length} documents for application ${applicationId}`);
    
    res.json({
      success: true,
      applicationId: applicationId,
      count: docs.length,
      documents: docs.map(doc => ({
        documentId: doc.id,
        documentType: doc.documentType,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        storageKey: doc.storageKey,
        uploadedAt: doc.uploadedAt,
        checksum: doc.checksum
      }))
    });
    
  } catch (error: any) {
    console.error(`❌ [DOCUMENTS] Error listing documents:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to list documents',
      details: error instanceof Error ? error.message : String(error),
      code: 'SERVER_ERROR'
    });
  }
});

export default router;