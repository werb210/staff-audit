/**
 * 🚀 S3 DIRECT UPLOAD ROUTES
 * 
 * Implements S3-first document upload for production pipeline
 * Created: July 24, 2025
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { uploadToS3, generateS3Key } from '../config/s3Config.js';
import { db, pool } from '../db.js';
import { documents } from '../../shared/schema.js';
import { sql } from 'drizzle-orm';
import { computeChecksum } from '../utils/bulletproofDocumentStorage.js';

// Multer configuration for S3 upload
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory for S3 upload
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
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
      'image/tiff'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

const router = Router();

// POST /api/public/s3-upload/:applicationId - S3 Direct Upload
router.post('/s3-upload/:applicationId', upload.single('document'), async (req: Request, res: Response) => {
  console.log(`🚀 [S3-UPLOAD] Starting S3 direct upload for application: ${req.params.applicationId}`);
  
  try {
    const { applicationId } = req.params;
    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    console.log(`📄 [S3-UPLOAD] File: ${file.originalname}, Size: ${file.size} bytes`);
    console.log(`📋 [S3-UPLOAD] Document Type: ${documentType}`);

    // Generate document ID and checksum
    const documentId = uuidv4();
    const checksum = computeChecksum(file.buffer);
    
    console.log(`🔒 [S3-UPLOAD] Document ID: ${documentId}`);
    console.log(`🔒 [S3-UPLOAD] Checksum: ${checksum}`);

    // Upload to S3
    const storageKey = await uploadToS3({
      file: file.buffer,
      fileName: file.originalname,
      contentType: file.mimetype,
      applicationId: applicationId
    });

    console.log(`☁️ [S3-UPLOAD] File uploaded to S3: ${storageKey}`);

    // Create database record with S3 storage key using raw SQL to avoid field mapping issues
    const insertQuery = `
      INSERT INTO documents (
        id, application_id, document_type, file_name, file_path, file_size, 
        file_type, file_exists, checksum, storage_key, backup_status, 
        is_required, is_verified, uploaded_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING id, file_name, storage_key, file_size, checksum
    `;
    
    const dbResult = await pool.query(insertQuery, [
      documentId,
      applicationId,
      documentType,
      file.originalname,
      null, // No local file path for S3-only storage
      file.size,
      file.mimetype,
      true, // file_exists
      checksum,
      storageKey, // S3 key for retrieval
      'completed', // backup_status
      false, // is_required
      false, // is_verified
      'system', // uploaded_by
      new Date().toISOString(),
      new Date().toISOString()
    ]);

    console.log(`💾 [S3-UPLOAD] Database record created: ${documentId}`);

    // Auto-trigger OCR for financial documents
    if (['bank_statements', 'financial_statements', 'tax_returns'].includes(documentType)) {
      try {
        console.log(`🔍 [AUTO-OCR] Triggering OCR for ${documentType} document...`);
        const fetch = (await import('node-fetch')).default;
        await fetch(`http://localhost:5000/api/ocr/application/${applicationId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dev-bypass': 'true'
          }
        });
        console.log(`✅ [AUTO-OCR] OCR triggered successfully`);
      } catch (ocrError) {
        console.error(`❌ [AUTO-OCR] Failed to trigger OCR:`, ocrError);
        // Continue without OCR - upload is still successful
      }
    }

    res.json({
      success: true,
      documentId: documentId,
      storageKey: storageKey,
      fileName: file.originalname,
      fileSize: file.size,
      checksum: checksum,
      message: 'Document uploaded to S3 successfully'
    });

  } catch (error: any) {
    console.error(`❌ [S3-UPLOAD] Upload failed:`, error);
    res.status(500).json({
      error: 'Upload failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;