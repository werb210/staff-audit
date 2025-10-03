#!/usr/bin/env tsx
/**
 * Document Recovery Script
 * Fixes orphaned files and creates missing database records
 */

import { db } from '../server/db';
import { documents } from '../shared/schema';
import fs from 'fs';
import path from 'path';

interface OrphanedFile {
  filename: string;
  fullPath: string;
  size: number;
  extension: string;
}

async function findOrphanedFiles(): Promise<OrphanedFile[]> {
  const documentsDir = path.join(process.cwd(), 'uploads', 'documents');
  const files = fs.readdirSync(documentsDir);
  const orphanedFiles: OrphanedFile[] = [];

  // Get all document IDs from database
  const dbDocuments = await db.select({ id: documents.id }).from(documents);
  const dbIds = new Set(dbDocuments.map(doc => doc.id));

  for (const filename of files) {
    const fullPath = path.join(documentsDir, filename);
    const stats = fs.statSync(fullPath);
    
    // Skip if it's a directory
    if (stats.isDirectory()) continue;
    
    // Extract UUID from filename (assumes UUID.extension format)
    const uuidMatch = filename.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/);
    if (!uuidMatch) continue;
    
    const fileId = uuidMatch[1];
    
    // If file exists but no database record, it's orphaned
    if (!dbIds.has(fileId)) {
      orphanedFiles.push({
        filename,
        fullPath,
        size: stats.size,
        extension: path.extname(filename)
      });
    }
  }

  return orphanedFiles;
}

async function createRecoveryRecords(orphanedFiles: OrphanedFile[]) {
  console.log(`🔧 Creating database records for ${orphanedFiles.length} orphaned files...`);
  
  for (const file of orphanedFiles) {
    const fileId = file.filename.match(/^([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/)?.[1];
    if (!fileId) continue;

    // Determine document type from extension
    let documentType = 'other';
    if (file.extension === '.pdf') documentType = 'bank_statements';
    else if (file.extension === '.txt') documentType = 'profit_loss_statement';
    else if (file.extension === '.json') documentType = 'balance_sheet';

    try {
      await db.insert(documents).values({
        id: fileId,
        applicationId: 'daf43ad6-5e74-402f-a5bd-dbe151215762', // Use test application
        fileName: file.filename,
        filePath: `uploads/documents/${file.filename}`,
        fileSize: file.size,
        fileType: file.extension.substring(1),
        documentType,
        uploadedBy: 'recovery-script',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      console.log(`✅ Created record for: ${file.filename}`);
    } catch (error) {
      console.error(`❌ Failed to create record for ${file.filename}:`, error);
    }
  }
}

async function main() {
  console.log('🧪 DOCUMENT RECOVERY SCRIPT STARTING...');
  
  const orphanedFiles = await findOrphanedFiles();
  console.log(`📊 Found ${orphanedFiles.length} orphaned files`);
  
  if (orphanedFiles.length > 0) {
    console.log('Orphaned files:');
    orphanedFiles.forEach(file => {
      console.log(`  - ${file.filename} (${file.size} bytes)`);
    });
    
    await createRecoveryRecords(orphanedFiles);
  }
  
  console.log('✅ DOCUMENT RECOVERY COMPLETED');
  process.exit(0);
}

main().catch(console.error);