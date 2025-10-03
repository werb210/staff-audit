import type { Express } from 'express';

export function mountDebugPipeline(app: Express) {
  
  // Simple debug endpoint that bypasses all auth (mounted early)
  app.get('/debug-pipeline-data', async (req: any, res: any) => {
    try {
      const { pool } = await import('../db');
      
      // Get basic application data
      const appsQuery = `
        SELECT 
          id, 
          status, 
          business_name,
          legal_business_name,
          COALESCE(requested_amount, amount_requested, 0) as amount,
          created_at, 
          updated_at
        FROM applications 
        ORDER BY created_at DESC 
        LIMIT 5
      `;
      
      // Get documents for applications
      const docsQuery = `
        SELECT 
          application_id,
          document_type,
          status,
          file_name,
          file_exists,
          created_at
        FROM documents 
        ORDER BY created_at DESC
        LIMIT 10
      `;
      
      const [appsResult, docsResult] = await Promise.all([
        pool.query(appsQuery),
        pool.query(docsQuery)
      ]);
      
      // Group documents by application
      const docsByApp = {};
      docsResult.rows.forEach(doc => {
        if (!docsByApp[doc.application_id]) {
          docsByApp[doc.application_id] = [];
        }
        docsByApp[doc.application_id].push(doc);
      });
      
      res.json({
        success: true,
        applications: appsResult.rows.map(app => ({
          ...app,
          documents: docsByApp[app.id] || []
        })),
        stats: {
          totalApplications: appsResult.rows.length,
          totalDocuments: docsResult.rows.length,
          documentsByStatus: docsResult.rows.reduce((acc, doc) => {
            acc[doc.status || 'null'] = (acc[doc.status || 'null'] || 0) + 1;
            return acc;
          }, {})
        }
      });
      
    } catch (error: unknown) {
      console.error('Debug pipeline error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });
  
  console.log('✅ Debug pipeline endpoint mounted at /debug-pipeline-data');
}