import express from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/index';
import { documents, applications } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';
import { S3Storage } from '../utils/s3.js';

const router = express.Router();

// Multer configuration for memory storage (S3 upload)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    // Accept common document formats
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type: ${file.mimetype}`));
    }
  }
});

/**
 * POST /api/public/applications/:applicationId/documents
 * Upload document for application with S3 storage
 */
router.post('/public/applications/:applicationId/documents', upload.single('document'), async (req: any, res: any) => {
  try {
    console.log(`🔄 [DOCUMENT UPLOAD] Starting upload for application ${req.params.applicationId}`);
    
    const { applicationId } = req.params;
    const { documentType } = req.body;
    const file = req.file;

    // Validate input
    if (!file) {
      console.error('❌ [DOCUMENT UPLOAD] No file provided');
      return res.status(400).json({ 
        success: false, 
        message: "No file provided" 
      });
    }

    if (!documentType) {
      console.error('❌ [DOCUMENT UPLOAD] No documentType provided');
      return res.status(400).json({ 
        success: false, 
        message: "documentType is required" 
      });
    }

    // Validate application exists - use raw SQL to avoid ORM issues
    const applicationResult = await db.execute(sql`
      SELECT id FROM applications WHERE id = ${applicationId} LIMIT 1
    `);
    
    const application = applicationResult.rows[0];

    if (!application) {
      console.error(`❌ [DOCUMENT UPLOAD] Application ${applicationId} not found`);
      return res.status(404).json({ 
        success: false, 
        message: "Application not found" 
      });
    }

    console.log(`✅ [DOCUMENT UPLOAD] Application ${applicationId} validated`);

    // Generate SHA256 checksum
    const sha256 = crypto.createHash('sha256').update(file.buffer).digest('hex');
    console.log(`🔐 [DOCUMENT UPLOAD] Generated SHA256: ${sha256.substring(0, 8)}...`);

    // Upload to S3
    console.log(`☁️ [DOCUMENT UPLOAD] Uploading to S3...`);
    const s3Storage = new S3Storage();
    const storageKey = await s3Storage.set(file.buffer, file.originalname, applicationId);

    console.log(`✅ [DOCUMENT UPLOAD] S3 upload successful: ${storageKey}`);

    // Create database record
    const documentId = uuidv4();
    
    // Use raw SQL to avoid field mapping issues
    await db.execute(sql`
      INSERT INTO documents (
        id, 
        applicationId, 
        name, 
        document_type, 
        storage_key, 
        checksum, 
        size, 
        mime_type,
        createdAt
      ) VALUES (
        ${documentId}, ${applicationId}, ${file.originalname}, ${documentType}, ${storageKey}, ${sha256}, ${file.size}, ${file.mimetype}, NOW()
      )
    `);

    console.log(`✅ [DOCUMENT UPLOAD] Database record created: ${documentId}`);

    // Success response
    res.status(200).json({
      success: true,
      documentId,
      storageKey,
      fileName: file.originalname,
      fileSize: file.size,
      checksum: sha256,
      message: "Document uploaded successfully"
    });

    console.log(`🎉 [DOCUMENT UPLOAD] Upload completed successfully for ${file.originalname}`);

  } catch (error: unknown) {
    console.error('❌ [DOCUMENT UPLOAD] Upload failed:', error);
    
    res.status(500).json({
      success: false,
      message: "Upload failed",
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

/**
 * GET /api/public/applications/:applicationId/documents
 * List documents for application
 */
router.get('/public/applications/:applicationId/documents', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;

    console.log(`📋 [DOCUMENT LIST] Fetching documents for application ${applicationId}`);

    // Get documents from database
    const docs = await db.execute(`
      SELECT 
        id as "documentId",
        name as "fileName",
        document_type as "documentType", 
        storage_key as "storageKey",
        checksum,
        size as "fileSize",
        mime_type as "mimeType",
        createdAt as "uploadedAt"
      FROM documents 
      WHERE applicationId = '${applicationId}'
      AND storage_key IS NOT NULL
      ORDER BY createdAt DESC
    `);

    console.log(`✅ [DOCUMENT LIST] Found ${docs.rows.length} documents`);

    res.status(200).json(docs.rows);

  } catch (error: unknown) {
    console.error('❌ [DOCUMENT LIST] Error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch documents",
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

export default router;