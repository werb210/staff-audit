import type { Express } from 'express';

export function mountTestPipeline(app: Express) {
  // Simple test endpoint for pipeline data
  app.get('/api/test-pipeline/simple', async (req: any, res: any) => {
    try {
      const { pool } = await import('../db');
      
      const appsQuery = `
        SELECT 
          id, 
          status, 
          business_name,
          COALESCE(requested_amount, amount_requested, 0) as amount,
          created_at, 
          updated_at
        FROM applications 
        ORDER BY created_at DESC 
        LIMIT 10
      `;
      
      const docsQuery = `
        SELECT 
          application_id,
          document_type,
          status,
          file_name,
          created_at
        FROM documents 
        WHERE file_exists = true 
        LIMIT 20
      `;
      
      const [appsResult, docsResult] = await Promise.all([
        pool.query(appsQuery),
        pool.query(docsQuery)
      ]);
      
      res.json({
        success: true,
        applications: appsResult.rows,
        documents: docsResult.rows,
        stats: {
          totalApplications: appsResult.rows.length,
          totalDocuments: docsResult.rows.length
        }
      });
      
    } catch (error: unknown) {
      console.error('Test pipeline error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  console.log('✅ Test pipeline endpoint mounted');
}