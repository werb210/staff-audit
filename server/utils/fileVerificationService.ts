/**
 * 🚨 CRITICAL FILE WRITE VERIFICATION SERVICE
 * Implements mandatory file write verification to prevent silent upload failures
 */

import { promises as fs } from 'fs';
import path from 'path';
import { db } from '../db.js';
import { documents } from '../../shared/schema.js';

/**
 * Verifies all uploaded files exist on disk with correct sizes
 * Called during startup and available for manual verification
 */
export async function verifyUploadedFiles(): Promise<{
  total: number;
  valid: number;
  missing: number;
  corrupted: number;
  issues: Array<{
    documentId: string;
    fileName: string;
    issue: string;
    expectedSize: number;
    actualSize?: number;
  }>;
}> {
  console.log(`🔍 [FILE VERIFICATION] Starting comprehensive file verification audit...`);
  
  const allDocs = await db.select().from(documents);
  console.log(`📋 [FILE VERIFICATION] Found ${allDocs.length} documents in database`);
  
  const results = {
    total: allDocs.length,
    valid: 0,
    missing: 0,
    corrupted: 0,
    issues: [] as Array<{
      documentId: string;
      fileName: string;
      issue: string;
      expectedSize: number;
      actualSize?: number;
    }>
  };
  
  for (const doc of allDocs) {
    try {
      // Construct expected file path
      const filePath = path.join(process.cwd(), doc.filePath || '');
      
      try {
        const stats = await fs.stat(filePath);
        
        // Check if file is too small (likely corrupted)
        if (stats.size < 100) {
          results.corrupted++;
          results.issues.push({
            documentId: doc.id,
            fileName: doc.fileName || 'unknown',
            issue: 'File too small (corrupted)',
            expectedSize: doc.fileSize || 0,
            actualSize: stats.size
          });
          console.error(`🚨 [FILE VERIFICATION] Corrupted file: ${doc.fileName} (${doc.id}) - ${stats.size} bytes`);
          continue;
        }
        
        // Check if file size matches database record
        // Note: Many old documents may not have size recorded, so we only validate if it exists
        if (doc.fileSize !== null && doc.fileSize !== undefined && stats.size !== doc.fileSize) {
          results.corrupted++;
          results.issues.push({
            documentId: doc.id,
            fileName: doc.fileName || 'unknown',
            issue: 'File size mismatch',
            expectedSize: doc.fileSize,
            actualSize: stats.size
          });
          console.error(`🚨 [FILE VERIFICATION] Size mismatch: ${doc.fileName} (${doc.id}) - expected ${doc.fileSize}, got ${stats.size}`);
          continue;
        }
        
        // File is valid
        results.valid++;
        console.log(`✅ [FILE VERIFICATION] Valid: ${doc.fileName} (${stats.size} bytes)`);
        
      } catch (statError) {
        // File missing on disk
        results.missing++;
        results.issues.push({
          documentId: doc.id,
          fileName: doc.fileName || 'unknown',
          issue: 'File missing on disk',
          expectedSize: doc.fileSize || 0
        });
        console.error(`❌ [FILE VERIFICATION] Missing file: ${doc.fileName} (${doc.id})`);
      }
      
    } catch (error: any) {
      console.error(`❌ [FILE VERIFICATION] Error processing document ${doc.id}:`, error instanceof Error ? error.message : String(error));
      results.issues.push({
        documentId: doc.id,
        fileName: doc.fileName,
        issue: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
        expectedSize: doc.fileSize
      });
    }
  }
  
  // Summary
  console.log(`📊 [FILE VERIFICATION] SUMMARY:`);
  console.log(`   Total documents: ${results.total}`);
  console.log(`   Valid files: ${results.valid}`);
  console.log(`   Missing files: ${results.missing}`);
  console.log(`   Corrupted files: ${results.corrupted}`);
  console.log(`   Issues found: ${results.issues.length}`);
  
  if (results.issues.length > 0) {
    console.log(`🚨 [FILE VERIFICATION] CRITICAL: ${results.issues.length} file integrity issues detected!`);
  } else {
    console.log(`✅ [FILE VERIFICATION] All files verified successfully`);
  }
  
  return results;
}

/**
 * Quick verification for a single document
 */
export async function verifySingleDocument(documentId: string): Promise<{
  valid: boolean;
  issue?: string;
  expectedSize?: number;
  actualSize?: number;
}> {
  try {
    const doc = await db.select().from(documents).where(documents.id.eq(documentId)).limit(1);
    if (doc.length === 0) {
      return { valid: false, issue: 'Document not found in database' };
    }
    
    const docRecord = doc[0];
    const filePath = path.join(process.cwd(), docRecord.filePath || '');
    
    try {
      const stats = await fs.stat(filePath);
      
      if (stats.size < 100) {
        return {
          valid: false,
          issue: 'File too small (corrupted)',
          expectedSize: docRecord.fileSize,
          actualSize: stats.size
        };
      }
      
      if (stats.size !== docRecord.fileSize) {
        return {
          valid: false,
          issue: 'File size mismatch',
          expectedSize: docRecord.fileSize,
          actualSize: stats.size
        };
      }
      
      return { valid: true };
      
    } catch (statError) {
      return {
        valid: false,
        issue: 'File missing on disk',
        expectedSize: docRecord.fileSize
      };
    }
    
  } catch (error: any) {
    return {
      valid: false,
      issue: `Verification error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}