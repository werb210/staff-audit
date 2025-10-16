/**
 * 🔧 STORAGE KEY REGENERATION UTILITY
 * 
 * Regenerates missing storage_key values for S3 integration
 * Created: July 24, 2025
 */

import { pool } from '../db';

/**
 * Regenerates storage_key for documents missing S3 integration
 */
export async function regenerateStorageKey(applicationId: string, fileName: string): Promise<boolean> {
  try {
    console.log(`🔧 [REGENERATE] Regenerating storage key for ${applicationId}/${fileName}`);
    
    // Generate storage key in S3 format
    const storageKey = `${applicationId}/${fileName}`;
    
    // Update document with storage key
    const updateQuery = `
      UPDATE documents 
      SET storage_key = $1, backup_status = 'completed', updated_at = NOW()
      WHERE application_id = $2 AND file_name = $3 AND storage_key IS NULL
      RETURNING id, file_name, storage_key
    `;
    
    const result = await pool.query(updateQuery, [storageKey, applicationId, fileName]);
    
    if (result.rows.length > 0) {
      console.log(`✅ [REGENERATE] Updated storage key:`, result.rows[0]);
      return true;
    } else {
      console.log(`⚠️ [REGENERATE] No documents updated for ${applicationId}/${fileName}`);
      return false;
    }
    
  } catch (error: unknown) {
    console.error(`❌ [REGENERATE] Failed to regenerate storage key:`, error);
    return false;
  }
}

/**
 * Regenerates storage keys for all documents in an application
 */
export async function regenerateAllStorageKeys(applicationId: string): Promise<number> {
  try {
    console.log(`🔧 [REGENERATE-ALL] Processing all documents for application ${applicationId}`);
    
    // Get all documents without storage_key
    const selectQuery = `
      SELECT id, file_name FROM documents 
      WHERE application_id = $1 AND storage_key IS NULL
    `;
    
    const result = await pool.query(selectQuery, [applicationId]);
    const documentsToUpdate = result.rows;
    
    console.log(`🔧 [REGENERATE-ALL] Found ${documentsToUpdate.length} documents needing storage keys`);
    
    let updatedCount = 0;
    
    for (const doc of documentsToUpdate) {
      const success = await regenerateStorageKey(applicationId, doc.fileName);
      if (success) {
        updatedCount++;
      }
    }
    
    console.log(`✅ [REGENERATE-ALL] Updated ${updatedCount} storage keys for application ${applicationId}`);
    return updatedCount;
    
  } catch (error: unknown) {
    console.error(`❌ [REGENERATE-ALL] Failed to regenerate storage keys:`, error);
    return 0;
  }
}