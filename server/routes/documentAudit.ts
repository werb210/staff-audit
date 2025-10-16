import { Router, Request, Response } from 'express';
import { neon } from '@neondatabase/serverless';
import fs from 'fs/promises';
import path from 'path';

const router = Router();
const sql = neon(process.env.DATABASE_URL!);

interface DocumentRecord {
  id: string;
  application_id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  created_at: string;
}

async function checkFileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

// GET /api/document-audit - Complete document system health check
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Running comprehensive document audit...');
    
    // Get all documents from database
    const documents = await sql`SELECT * FROM documents ORDER BY created_at DESC`;
    console.log(`📄 Found ${documents.length} documents in database`);
    
    const auditResults = {
      summary: {
        totalDocuments: documents.length,
        accessible: 0,
        missing: 0,
        missingFiles: [] as string[]
      },
      details: [] as any[]
    };
    
    // Check each document
    for (const doc of documents as DocumentRecord[]) {
      const filePath = doc.file_path;
      const isAccessible = await checkFileExists(filePath);
      
      const docAudit = {
        id: doc.id,
        fileName: doc.file_name,
        filePath: doc.file_path,
        applicationId: doc.application_id,
        createdAt: doc.created_at,
        accessible: isAccessible,
        status: isAccessible ? 'OK' : 'MISSING'
      };
      
      auditResults.details.push(docAudit);
      
      if (isAccessible) {
        auditResults.summary.accessible++;
      } else {
        auditResults.summary.missing++;
        auditResults.summary.missingFiles.push(doc.file_name);
      }
    }
    
    console.log(`📊 Audit complete: ${auditResults.summary.accessible} accessible, ${auditResults.summary.missing} missing`);
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...auditResults
    });
    
  } catch (error: any) {
    console.error('❌ Document audit failed:', error);
    res.status(500).json({
      success: false,
      error: 'Document audit failed',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;