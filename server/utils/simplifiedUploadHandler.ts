/**
 * 🔧 SIMPLIFIED UPLOAD HANDLER  
 * Disk-only upload system without cloud backup complexity
 * Focus on reliable file saves with validation
 */

import fs from 'fs/promises';
import crypto from 'crypto';
import { validateUploadPersistence, logUploadValidation } from './uploadPersistenceValidator';
import { neon } from '@neondatabase/serverless';
import { checkUploadFreeze } from '../routes/uploadFreeze';

export interface SimplifiedUploadOptions {
  file: Express.Multer.File;
  applicationId: string;
  documentType: string;
  uploadedBy?: string;
}

export interface SimplifiedUploadResult {
  success: boolean;
  documentId?: string;
  error?: string;
  validationDetails?: any;
  filePath?: string;
  checksum?: string;
}

export async function simplifiedUploadHandler(options: SimplifiedUploadOptions): Promise<SimplifiedUploadResult> {
  const { file, applicationId, documentType, uploadedBy } = options;
  
  console.log(`🚀 [SIMPLE-UPLOAD] Starting simplified upload for: ${file.originalname}`);

  // STEP 0: Check if uploads are frozen
  const isFrozen = await checkUploadFreeze();
  if (isFrozen) {
    console.error(`❌ [SIMPLE-UPLOAD] Uploads are frozen for maintenance`);
    return {
      success: false,
      error: 'Upload system is temporarily disabled for maintenance'
    };
  }

  const documentId = crypto.randomUUID();
  const fileName = file.originalname;
  const fileExtension = fileName.split('.').pop();
  const filePath = `uploads/documents/${documentId}.${fileExtension}`;
  
  // Compute checksums
  const uploadChecksum = crypto.createHash('sha256').update(file.buffer).digest('hex');
  const fileSize = file.buffer.length;

  console.log(`📊 [SIMPLE-UPLOAD] Details - Size: ${fileSize} bytes, Type: ${documentType}`);
  console.log(`🔒 [SIMPLE-UPLOAD] Checksum: ${uploadChecksum.slice(0, 16)}...`);

  try {
    // STEP 1: Save to disk with atomic write
    console.log(`💾 [SIMPLE-UPLOAD] Step 1: Saving to disk...`);
    await fs.mkdir('uploads/documents', { recursive: true });
    await fs.writeFile(filePath, file.buffer);
    console.log(`✅ [SIMPLE-UPLOAD] Disk save successful: ${filePath}`);

    // STEP 2: Validate file immediately
    console.log(`🔍 [SIMPLE-UPLOAD] Step 2: Validating file...`);
    const validation = await validateUploadPersistence(filePath, fileSize, uploadChecksum, file.buffer);
    
    if (!validation.success) {
      console.error(`❌ [SIMPLE-UPLOAD] File validation failed:`, validation.error);
      
      // Cleanup failed file
      try {
        await fs.unlink(filePath);
        console.log(`🧹 [SIMPLE-UPLOAD] Cleaned up failed file: ${filePath}`);
      } catch (cleanupError) {
        console.error(`❌ [SIMPLE-UPLOAD] Cleanup failed:`, cleanupError);
      }
      
      return {
        success: false,
        error: `File validation failed: ${validation.error}`,
        validationDetails: validation
      };
    }

    console.log(`✅ [SIMPLE-UPLOAD] File validation successful`);

    // STEP 3: Save to database
    console.log(`📊 [SIMPLE-UPLOAD] Step 3: Saving to database...`);
    const sql = neon(process.env.DATABASE_URL!);
    
    const insertQuery = `
      INSERT INTO documents (
        id, application_id, file_name, file_path, file_size, 
        file_type, document_type, checksum, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()
      )
    `;

    await sql(insertQuery, [
      documentId,
      applicationId,
      fileName,
      filePath,
      fileSize,
      file.mimetype,
      documentType,
      uploadChecksum
    ]);

    console.log(`✅ [SIMPLE-UPLOAD] Database record created: ${documentId}`);

    // STEP 4: Log validation result
    await logUploadValidation(documentId, fileName, validation, applicationId);

    console.log(`🎯 [SIMPLE-UPLOAD] Upload completed successfully for: ${fileName}`);

    return {
      success: true,
      documentId,
      filePath,
      checksum: uploadChecksum,
      validationDetails: validation
    };

  } catch (error: unknown) {
    console.error(`❌ [SIMPLE-UPLOAD] Upload failed:`, error);

    // Cleanup any partial files
    try {
      await fs.unlink(filePath);
      console.log(`🧹 [SIMPLE-UPLOAD] Cleaned up after error: ${filePath}`);
    } catch (cleanupError) {
      console.error(`❌ [SIMPLE-UPLOAD] Error cleanup failed:`, cleanupError);
    }

    return {
      success: false,
      error: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown upload error'
    };
  }
}