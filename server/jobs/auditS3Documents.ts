import { pool } from "../db.js";
// Simple audit without ORM to avoid module issues

export async function auditS3Documents() {
  console.log('[S3-AUDIT] Starting daily S3 document audit...');
  
  try {
    // Find all active documents using direct SQL query
    const result = await pool.query('SELECT id, name, storage_key, object_storage_key FROM documents');
    const allDocuments = result.rows;
    
    console.log(`[S3-AUDIT] Found ${allDocuments.length} documents to audit`);
    
    const missing: string[] = [];
    const s3Documents: any[] = [];
    const localDocuments: any[] = [];
    
    // Categorize documents by storage type
    for (const doc of allDocuments) {
      if (doc.storage_key || doc.object_storage_key) {
        s3Documents.push(doc);
      } else {
        localDocuments.push(doc);
      }
    }
    
    console.log(`[S3-AUDIT] S3 documents: ${s3Documents.length}, Local documents: ${localDocuments.length}`);
    
    // For S3 documents, check if they exist in S3
    if (s3Documents.length > 0) {
      const { S3Client, HeadObjectCommand } = await import("@aws-sdk/client-s3");
      
      const s3Client = new S3Client({
        region: process.env.AWS_DEFAULT_REGION || 'ca-central-1',
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      });
      
      const bucket = process.env.S3_BUCKET_NAME!;
      
      for (const doc of s3Documents) {
        const key = doc.storage_key || doc.object_storage_key || `uploads/${doc.id}.pdf`;
        
        try {
          await s3Client.send(new HeadObjectCommand({ 
            Bucket: bucket, 
            Key: key 
          }));
          console.log(`[S3-AUDIT] ✅ S3 file exists: ${key}`);
        } catch (err: any) {
          console.error(`[S3-AUDIT] ❌ Missing S3 file: ${key} - ${err.message}`);
          missing.push(doc.id);
        }
      }
    }
    
    // For local documents, check if they exist on disk
    const fs = await import('fs/promises');
    const path = await import('path');
    
    for (const doc of localDocuments) {
      const filePath = path.resolve(`uploads/documents/${doc.id}.${doc.name?.split('.').pop() || 'pdf'}`);
      
      try {
        await fs.access(filePath);
        console.log(`[S3-AUDIT] ✅ Local file exists: ${doc.name}`);
      } catch (err) {
        console.error(`[S3-AUDIT] ❌ Missing local file: ${doc.name}`);
        missing.push(doc.id);
      }
    }
    
    // Generate audit report
    const auditReport = {
      timestamp: new Date().toISOString(),
      totalDocuments: allDocuments.length,
      s3Documents: s3Documents.length,
      localDocuments: localDocuments.length,
      missingDocuments: missing.length,
      missingIds: missing,
      status: missing.length === 0 ? 'HEALTHY' : 'ISSUES_FOUND'
    };
    
    console.log(`[S3-AUDIT] AUDIT COMPLETE - Status: ${auditReport.status}`);
    console.log(`[S3-AUDIT] Missing files: ${missing.length}/${allDocuments.length}`);
    
    if (missing.length > 0) {
      console.error(`[S3-AUDIT] ⚠️ Found ${missing.length} missing documents:`, missing);
    }
    
    return auditReport;
    
  } catch (error) {
    console.error('[S3-AUDIT] Audit failed:', error);
    throw error;
  }
}

// Allow script to be run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  auditS3Documents()
    .then(report => {
      console.log('[S3-AUDIT] Final Report:', JSON.stringify(report, null, 2));
      process.exit(report.status === 'HEALTHY' ? 0 : 1);
    })
    .catch(error => {
      console.error('[S3-AUDIT] Failed:', error);
      process.exit(1);
    });
}