/**
 * 🔧 DOCUMENT RESYNC UTILITY
 * 
 * Emergency resync system for fixing document-application associations
 * Fixes the A10 application document synchronization issue
 * 
 * Created: July 25, 2025
 */

import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

/**
 * POST /api/document-resync/fix-associations
 * Fix orphaned documents by associating them with correct applications
 */
router.post('/fix-associations', async (req: Request, res: Response) => {
  try {
    console.log('🔧 [DOC RESYNC] Starting document association fix...');
    
    // Get all applications and their expected document count
    const applicationsQuery = `
      SELECT 
        a.id,
        a.created_at,
        b.business_name,
        a.status,
        a.stage,
        (SELECT COUNT(*) FROM documents d WHERE d.application_id = a.id) as doc_count
      FROM applications a
      LEFT JOIN businesses b ON a.business_id = b.id
      ORDER BY a.created_at DESC
    `;
    
    const applicationsResult = await pool.query(applicationsQuery);
    const applications = applicationsResult.rows;
    
    console.log(`📊 [DOC RESYNC] Found ${applications.length} applications`);
    
    // Get all documents that might be orphaned
    const orphanedDocsQuery = `
      SELECT 
        d.*,
        CASE 
          WHEN a.id IS NOT NULL THEN 'linked'
          ELSE 'orphaned'
        END as status
      FROM documents d
      LEFT JOIN applications a ON d.application_id = a.id
      ORDER BY d.created_at DESC
    `;
    
    const docsResult = await pool.query(orphanedDocsQuery);
    const documents = docsResult.rows;
    
    console.log(`📁 [DOC RESYNC] Found ${documents.length} total documents`);
    
    const orphanedDocs = documents.filter(doc => doc.status === 'orphaned');
    const linkedDocs = documents.filter(doc => doc.status === 'linked');
    
    console.log(`🔗 [DOC RESYNC] Linked: ${linkedDocs.length}, Orphaned: ${orphanedDocs.length}`);
    
    // Try to associate orphaned documents with recent applications
    let fixedCount = 0;
    
    for (const doc of orphanedDocs) {
      // Find the most recent application that has no documents
      const applicationWithoutDocs = applications.find(app => 
        app.doc_count === 0 && 
        new Date(doc.created_at).getTime() >= new Date(app.created_at).getTime() - (24 * 60 * 60 * 1000) // Within 24 hours
      );
      
      if (applicationWithoutDocs) {
        console.log(`🔧 [DOC RESYNC] Linking document ${doc.id} to application ${applicationWithoutDocs.id} (${applicationWithoutDocs.business_name})`);
        
        const updateQuery = `
          UPDATE documents 
          SET application_id = $1 
          WHERE id = $2
        `;
        
        await pool.query(updateQuery, [applicationWithoutDocs.id, doc.id]);
        fixedCount++;
        
        // Update local tracking
        const appIndex = applications.findIndex(app => app.id === applicationWithoutDocs.id);
        if (appIndex !== -1) {
          applications[appIndex].doc_count++;
        }
      }
    }
    
    console.log(`✅ [DOC RESYNC] Fixed ${fixedCount} document associations`);
    
    // Get updated statistics
    const finalStatsQuery = `
      SELECT 
        COUNT(*) as total_docs,
        COUNT(CASE WHEN application_id IS NOT NULL THEN 1 END) as linked_docs,
        COUNT(CASE WHEN application_id IS NULL THEN 1 END) as orphaned_docs
      FROM documents
    `;
    
    const statsResult = await pool.query(finalStatsQuery);
    const stats = statsResult.rows[0];
    
    res.json({
      success: true,
      message: 'Document association fix completed',
      statistics: {
        totalApplications: applications.length,
        totalDocuments: parseInt(stats.total_docs),
        linkedDocuments: parseInt(stats.linked_docs),
        orphanedDocuments: parseInt(stats.orphaned_docs),
        fixedAssociations: fixedCount
      },
      applications: applications.map(app => ({
        id: app.id,
        businessName: app.business_name,
        documentCount: app.doc_count,
        status: app.status,
        createdAt: app.created_at
      }))
    });
    
  } catch (error: any) {
    console.error('❌ [DOC RESYNC] Fix failed:', error);
    res.status(500).json({
      success: false,
      error: 'Document resync failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/document-resync/status
 * Get current document association status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    console.log('📊 [DOC RESYNC] Getting current status...');
    
    // Get application document counts
    const query = `
      SELECT 
        a.id,
        a.created_at,
        b.business_name,
        a.status,
        a.stage,
        COUNT(d.id) as document_count
      FROM applications a
      LEFT JOIN businesses b ON a.business_id = b.id
      LEFT JOIN documents d ON d.application_id = a.id
      GROUP BY a.id, a.created_at, b.business_name, a.status, a.stage
      ORDER BY a.created_at DESC
    `;
    
    const result = await pool.query(query);
    const applications = result.rows;
    
    // Get orphaned document count
    const orphanedQuery = `
      SELECT COUNT(*) as orphaned_count
      FROM documents d
      LEFT JOIN applications a ON d.application_id = a.id
      WHERE a.id IS NULL
    `;
    
    const orphanedResult = await pool.query(orphanedQuery);
    const orphanedCount = parseInt(orphanedResult.rows[0].orphaned_count);
    
    res.json({
      success: true,
      summary: {
        totalApplications: applications.length,
        applicationsWithoutDocuments: applications.filter(app => app.document_count === 0).length,
        orphanedDocuments: orphanedCount,
        totalDocuments: applications.reduce((sum, app) => sum + parseInt(app.document_count), 0) + orphanedCount
      },
      applications: applications.map(app => ({
        id: app.id,
        businessName: app.business_name,
        status: app.status, 
        stage: app.stage,
        documentCount: parseInt(app.document_count),
        createdAt: app.created_at,
        needsDocuments: parseInt(app.document_count) === 0
      }))
    });
    
  } catch (error: any) {
    console.error('❌ [DOC RESYNC] Status check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Status check failed',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;