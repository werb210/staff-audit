import { promises as fs } from 'fs';
import path from 'path';
import { pool } from '../db.js';
import { recoveryLogger } from './recoveryLogger.js';

/**
 * ACTUAL FILE RECOVERY SERVICE
 * This service attempts to recover missing document files through multiple recovery methods
 */

export class FileRecoveryService {
  
  /**
   * Attempt to recover a missing document file using multiple strategies
   */
  async recoverMissingDocument(documentId: string): Promise<{
    success: boolean;
    recoveryMethod?: string;
    newPath?: string;
    error?: string;
  }> {
    try {
      console.log(`🔄 [FILE RECOVERY] Starting recovery for document: ${documentId}`);
      
      // Get document metadata from database
      const docQuery = await pool.query(`
        SELECT d.*, a.legal_business_name 
        FROM documents d 
        LEFT JOIN applications a ON d.applicationId = a.id 
        WHERE d.id = $1
      `, [documentId]);
      
      if (docQuery.rows.length === 0) {
        return { success: false, error: 'Document not found in database' };
      }
      
      const doc = docQuery.rows[0];
      const expectedPath = `uploads/documents/${documentId}.${this.getFileExtension(doc.fileName)}`;
      
      // Try multiple recovery strategies
      const recoveryMethods = [
        () => this.recoverFromOrphanedFiles(documentId, doc.fileName),
        () => this.recoverFromApplicationFolder(documentId, doc.applicationId, doc.fileName),
        () => this.recoverFromBackupLocations(documentId, doc.fileName),
        // DISABLED: Placeholder file generation creates .txt files instead of real documents
        // () => this.generatePlaceholderFile(documentId, doc.fileName, doc.fileSize)
      ];
      
      for (const method of recoveryMethods) {
        const result = await method();
        if (result.success) {
          // Log successful recovery
          await recoveryLogger.logRecoverySuccess(
            documentId,
            doc.fileName,
            doc.applicationId,
            doc.legal_business_name || 'Unknown Business',
            result.recoveryMethod!,
            result.newPath!
          );
          
          // Update database with recovered file path - KEEP ORIGINAL FILENAME
          let updatedFileName = doc.fileName;
          
          await pool.query(`
            UPDATE documents 
            SET file_path = $1, name = $2 
            WHERE id = $3
          `, [result.newPath, updatedFileName, documentId]);
          
          console.log(`📝 [FILE RECOVERY] Database updated - file path: ${result.newPath}, filename: ${updatedFileName}`);
          
          console.log(`✅ [FILE RECOVERY] Successfully recovered: ${doc.fileName} using ${result.recoveryMethod}`);
          return result;
        }
      }
      
      // All recovery methods failed
      await recoveryLogger.logRecoveryFailure(
        documentId,
        doc.fileName,
        doc.applicationId,
        doc.legal_business_name || 'Unknown Business',
        'All recovery methods exhausted'
      );
      
      return { success: false, error: 'All recovery methods failed' };
      
    } catch (error: unknown) {
      console.error(`❌ [FILE RECOVERY] Recovery failed for ${documentId}:`, error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
  
  /**
   * Method 1: Look for the file among orphaned files in the uploads directory
   */
  private async recoverFromOrphanedFiles(documentId: string, fileName: string): Promise<{
    success: boolean;
    recoveryMethod?: string;
    newPath?: string;
  }> {
    try {
      const uploadsDir = path.resolve('./uploads/documents');
      const files = await fs.readdir(uploadsDir);
      
      // Look for files that match the document ID or similar name patterns
      const possibleMatches = files.filter(file => 
        file.includes(documentId) || 
        this.similarFileName(file, fileName)
      );
      
      for (const match of possibleMatches) {
        const sourcePath = path.join(uploadsDir, match);
        const targetPath = `uploads/documents/${documentId}.${this.getFileExtension(fileName)}`;
        const fullTargetPath = path.resolve(targetPath);
        
        // Verify the file exists and copy it
        const stats = await fs.stat(sourcePath);
        if (stats.isFile()) {
          await fs.copyFile(sourcePath, fullTargetPath);
          console.log(`🔄 [FILE RECOVERY] Recovered from orphaned file: ${match} -> ${targetPath}`);
          return {
            success: true,
            recoveryMethod: 'orphaned_file_recovery',
            newPath: targetPath
          };
        }
      }
      
      return { success: false };
    } catch (error: unknown) {
      console.log(`❌ [FILE RECOVERY] Orphaned file recovery failed: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false };
    }
  }
  
  /**
   * Method 2: Look in application-specific folders
   */
  private async recoverFromApplicationFolder(documentId: string, applicationId: string, fileName: string): Promise<{
    success: boolean;
    recoveryMethod?: string;
    newPath?: string;
  }> {
    try {
      const possiblePaths = [
        `uploads/applications/${applicationId}/${fileName}`,
        `uploads/${applicationId}/${fileName}`,
        `uploads/documents/${applicationId}/${fileName}`
      ];
      
      for (const possiblePath of possiblePaths) {
        const fullPath = path.resolve(possiblePath);
        try {
          const stats = await fs.stat(fullPath);
          if (stats.isFile()) {
            const targetPath = `uploads/documents/${documentId}.${this.getFileExtension(fileName)}`;
            const fullTargetPath = path.resolve(targetPath);
            
            await fs.copyFile(fullPath, fullTargetPath);
            console.log(`🔄 [FILE RECOVERY] Recovered from application folder: ${possiblePath} -> ${targetPath}`);
            return {
              success: true,
              recoveryMethod: 'application_folder_recovery',
              newPath: targetPath
            };
          }
        } catch {
          // Continue to next path
          continue;
        }
      }
      
      return { success: false };
    } catch (error: unknown) {
      console.log(`❌ [FILE RECOVERY] Application folder recovery failed: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false };
    }
  }
  
  /**
   * Method 3: Look in backup locations
   */
  private async recoverFromBackupLocations(documentId: string, fileName: string): Promise<{
    success: boolean;
    recoveryMethod?: string;
    newPath?: string;
  }> {
    try {
      const backupPaths = [
        `backups/documents/${fileName}`,
        `tmp/${fileName}`,
        `cache/${fileName}`
      ];
      
      for (const backupPath of backupPaths) {
        const fullPath = path.resolve(backupPath);
        try {
          const stats = await fs.stat(fullPath);
          if (stats.isFile()) {
            const targetPath = `uploads/documents/${documentId}.${this.getFileExtension(fileName)}`;
            const fullTargetPath = path.resolve(targetPath);
            
            await fs.copyFile(fullPath, fullTargetPath);
            console.log(`🔄 [FILE RECOVERY] Recovered from backup: ${backupPath} -> ${targetPath}`);
            return {
              success: true,
              recoveryMethod: 'backup_location_recovery',
              newPath: targetPath
            };
          }
        } catch {
          // Continue to next backup path
          continue;
        }
      }
      
      return { success: false };
    } catch (error: unknown) {
      console.log(`❌ [FILE RECOVERY] Backup recovery failed: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false };
    }
  }
  
  /**
   * Method 4: Generate a placeholder file indicating the original file was lost
   */
  private async generatePlaceholderFile(documentId: string, fileName: string, fileSize?: number): Promise<{
    success: boolean;
    recoveryMethod?: string;
    newPath?: string;
  }> {
    try {
      const targetPath = `uploads/documents/${documentId}.txt`;
      const fullTargetPath = path.resolve(targetPath);
      
      const placeholderContent = `DOCUMENT RECOVERY PLACEHOLDER

Original File: ${fileName}
Document ID: ${documentId}
Original Size: ${fileSize ? `${fileSize} bytes` : 'Unknown'}
Recovery Date: ${new Date().toISOString()}

This placeholder was created because the original document file was lost.
The document record exists in the database but the physical file is missing.

To restore this document:
1. Contact the document uploader to re-submit the file
2. Use the re-upload feature in the document management interface
3. Manually place the correct file at: uploads/documents/${documentId}.${this.getFileExtension(fileName)}

Status: REQUIRES MANUAL RECOVERY
`;
      
      // Ensure directory exists
      await fs.mkdir(path.dirname(fullTargetPath), { recursive: true });
      await fs.writeFile(fullTargetPath, placeholderContent, 'utf-8');
      
      console.log(`📄 [FILE RECOVERY] Generated placeholder file: ${targetPath}`);
      return {
        success: true,
        recoveryMethod: 'placeholder_generation',
        newPath: targetPath
      };
    } catch (error: unknown) {
      console.log(`❌ [FILE RECOVERY] Placeholder generation failed: ${error instanceof Error ? error.message : String(error)}`);
      return { success: false };
    }
  }
  
  /**
   * Batch recovery for multiple missing documents
   */
  async recoverMultipleDocuments(documentIds: string[]): Promise<{
    totalAttempted: number;
    successful: number;
    failed: number;
    results: Array<{
      documentId: string;
      success: boolean;
      recoveryMethod?: string;
      error?: string;
    }>;
  }> {
    console.log(`🔄 [FILE RECOVERY] Starting batch recovery for ${documentIds.length} documents`);
    
    const results = [];
    let successful = 0;
    let failed = 0;
    
    for (const documentId of documentIds) {
      const result = await this.recoverMissingDocument(documentId);
      results.push({
        documentId,
        success: result.success,
        recoveryMethod: result.recoveryMethod,
        error: result.error
      });
      
      if (result.success) {
        successful++;
      } else {
        failed++;
      }
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`✅ [FILE RECOVERY] Batch recovery completed: ${successful} successful, ${failed} failed`);
    
    return {
      totalAttempted: documentIds.length,
      successful,
      failed,
      results
    };
  }
  
  /**
   * Utility functions
   */
  private getFileExtension(fileName: string): string {
    const parts = fileName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : 'pdf';
  }
  
  private similarFileName(file1: string, file2: string): boolean {
    const normalize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalize(file1).includes(normalize(file2.split('.')[0])) ||
           normalize(file2).includes(normalize(file1.split('.')[0]));
  }
}

// Export singleton instance
export const fileRecoveryService = new FileRecoveryService();