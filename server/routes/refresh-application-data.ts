import type { Express } from 'express';
import { Pool } from 'pg';

/**
 * Endpoint to refresh application data and ensure all documents are properly linked
 * This will update application cards with complete field information and document status
 */
export function mountRefreshApplicationData(app: Express) {
  
  // Simple status endpoint for checking refresh functionality
  app.get('/api/applications/refresh/status', async (req: any, res: any) => {
    try {
      const { pool } = await import('../db');
      
      const countQuery = `
        SELECT 
          COUNT(*) as total_applications,
          COUNT(*) FILTER (WHERE status = 'new') as new_applications,
          COUNT(DISTINCT d.application_id) as apps_with_documents
        FROM applications a
        LEFT JOIN documents d ON a.id = d.application_id AND d.file_exists = true
      `;
      
      const result = await pool.query(countQuery);
      const stats = result.rows[0];
      
      res.json({
        success: true,
        stats: {
          totalApplications: parseInt(stats.total_applications),
          newApplications: parseInt(stats.new_applications),
          applicationsWithDocuments: parseInt(stats.apps_with_documents)
        }
      });
    } catch (error: unknown) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });
  
  // Refresh all application data and fix document associations (public endpoint for maintenance)
  app.post('/api/applications/refresh-all', async (req: any, res: any) => {
    try {
      const { pool } = await import('../db');
      
      // First, ensure all documents are properly associated with applications
      const documentFixQuery = `
        UPDATE documents 
        SET file_exists = true 
        WHERE file_exists IS NULL AND file_path IS NOT NULL;
      `;
      
      await pool.query(documentFixQuery);
      
      // Get refreshed application data with all fields populated
      const refreshQuery = `
        SELECT 
          a.id,
          a.status,
          a.tenant,
          -- Amount fields
          COALESCE(a.requested_amount, a.amount_requested, a.loan_amount) as amount,
          -- Business information
          COALESCE(b.business_name, a.legal_business_name, a.dba_name) as business_name,
          COALESCE(b.industry, a.industry) as industry,
          COALESCE(b.business_type, a.business_type, a.business_entity_type) as business_type,
          COALESCE(b.annual_revenue, a.annual_revenue) as annual_revenue,
          COALESCE(b.employee_count, a.number_of_employees) as employees,
          COALESCE(b.year_established, a.years_in_business) as years_in_business,
          COALESCE(b.business_address, a.business_address) as address,
          COALESCE(b.website, a.website) as website,
          -- Contact information
          COALESCE(b.business_email, a.business_email, a.contact_email) as email,
          COALESCE(b.business_phone, a.business_phone, a.contact_phone) as phone,
          COALESCE(a.contact_first_name, a.owner_first_name) as first_name,
          COALESCE(a.contact_last_name, a.owner_last_name) as last_name,
          -- Additional fields
          a.use_of_funds,
          a.created_at,
          a.updated_at,
          a.lender_id,
          a.product_id,
          -- Document statistics
          COALESCE(doc_stats.total_docs, 0) as document_count,
          COALESCE(doc_stats.verified_docs, 0) as verified_count,
          COALESCE(doc_stats.pending_docs, 0) as pending_count,
          doc_stats.recent_uploads,
          doc_stats.missing_required
        FROM applications a
        LEFT JOIN businesses b ON a.business_id = b.id
        LEFT JOIN (
          SELECT 
            d.application_id,
            COUNT(*) as total_docs,
            COUNT(*) FILTER (WHERE d.status = 'accepted' OR d.is_verified = true) as verified_docs,
            COUNT(*) FILTER (WHERE d.status = 'pending' OR d.status IS NULL) as pending_docs,
            jsonb_agg(
              jsonb_build_object(
                'id', d.id,
                'fileName', d.file_name,
                'documentType', d.document_type,
                'status', COALESCE(d.status, 'pending'),
                'uploadedAt', d.created_at,
                'fileSize', d.file_size,
                'isVerified', COALESCE(d.is_verified, false),
                'filePath', d.file_path,
                'storageKey', d.storage_key
              ) ORDER BY d.created_at DESC
            ) FILTER (WHERE d.id IS NOT NULL) as recent_uploads,
            -- Calculate missing required documents
            array_agg(DISTINCT ed.document_type) FILTER (
              WHERE ed.is_required = true 
              AND ed.document_type NOT IN (
                SELECT DISTINCT d2.document_type 
                FROM documents d2 
                WHERE d2.application_id = d.application_id 
                AND (d2.file_exists = true OR d2.status = 'accepted')
              )
            ) as missing_required
          FROM documents d
          FULL OUTER JOIN expected_documents ed ON d.application_id = ed.application_id
          WHERE d.file_exists = true OR ed.application_id IS NOT NULL
          GROUP BY d.application_id
        ) doc_stats ON a.id = doc_stats.application_id
        ORDER BY a.updated_at DESC, a.created_at DESC
      `;
      
      const result = await pool.query(refreshQuery);
      const applications = result.rows;
      
      // Update applications with refreshed data
      const updatePromises = applications.map(async (app) => {
        const updateQuery = `
          UPDATE applications 
          SET 
            updated_at = NOW(),
            missing_docs = $2,
            is_ready_for_lenders = $3
          WHERE id = $1
        `;
        
        const missingDocs = app.missing_required && app.missing_required.length > 0;
        const isReady = !missingDocs && app.verified_count > 0;
        
        return pool.query(updateQuery, [app.id, missingDocs, isReady]);
      });
      
      await Promise.all(updatePromises);
      
      res.json({
        success: true,
        message: 'Application data refreshed successfully',
        stats: {
          totalApplications: applications.length,
          withDocuments: applications.filter(a => a.document_count > 0).length,
          readyForLenders: applications.filter(a => a.verified_count > 0 && (!a.missing_required || a.missing_required.length === 0)).length,
          totalDocuments: applications.reduce((sum, a) => sum + parseInt(a.document_count), 0)
        },
        applications: applications.map(app => ({
          id: app.id,
          name: app.first_name && app.last_name ? `${app.first_name} ${app.last_name}` : app.business_name,
          company: app.business_name,
          documentCount: app.document_count,
          verifiedCount: app.verified_count,
          pendingCount: app.pending_count,
          missingRequired: app.missing_required || [],
          lastUpdated: app.updated_at
        }))
      });
      
    } catch (error: unknown) {
      console.error('Error refreshing application data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh application data',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Refresh individual application
  app.post('/api/applications/:id/refresh', async (req: any, res: any) => {
    try {
      const { pool } = await import('../db');
      const applicationId = req.params.id;
      
      // Get complete application data with documents
      const query = `
        SELECT 
          a.*,
          b.business_name as business_name,
          b.industry as business_industry,
          b.business_type as business_business_type,
          b.annual_revenue as business_annual_revenue,
          b.employee_count as business_employee_count,
          b.business_address as business_business_address,
          b.website as business_website,
          b.business_email as business_business_email,
          b.business_phone as business_business_phone,
          -- Document information
          doc_data.documents,
          doc_data.document_count,
          doc_data.verified_count,
          doc_data.pending_count,
          doc_data.missing_required
        FROM applications a
        LEFT JOIN businesses b ON a.business_id = b.id
        LEFT JOIN (
          SELECT 
            d.application_id,
            jsonb_agg(
              jsonb_build_object(
                'id', d.id,
                'fileName', d.file_name,
                'documentType', d.document_type,
                'status', COALESCE(d.status, 'pending'),
                'uploadedAt', d.created_at,
                'fileSize', d.file_size,
                'isVerified', COALESCE(d.is_verified, false),
                'filePath', d.file_path,
                'mimeType', d.mime_type,
                'storageKey', d.storage_key,
                'objectStorageKey', d.object_storage_key
              ) ORDER BY d.created_at DESC
            ) as documents,
            COUNT(*) as document_count,
            COUNT(*) FILTER (WHERE d.status = 'verified' OR d.is_verified = true) as verified_count,
            COUNT(*) FILTER (WHERE d.status = 'pending' OR d.status IS NULL) as pending_count,
            array_agg(DISTINCT ed.document_type) FILTER (
              WHERE ed.is_required = true 
              AND ed.document_type NOT IN (
                SELECT DISTINCT d2.document_type 
                FROM documents d2 
                WHERE d2.application_id = d.application_id 
                AND (d2.file_exists = true OR d2.status = 'accepted')
              )
            ) as missing_required
          FROM documents d
          FULL OUTER JOIN expected_documents ed ON d.application_id = ed.application_id
          WHERE (d.application_id = $1 OR ed.application_id = $1)
          AND d.file_exists = true
          GROUP BY d.application_id
        ) doc_data ON a.id = doc_data.application_id
        WHERE a.id = $1
      `;
      
      const result = await pool.query(query, [applicationId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Application not found'
        });
      }
      
      const app = result.rows[0];
      
      // Update the application with refreshed metadata
      const updateQuery = `
        UPDATE applications 
        SET 
          updated_at = NOW(),
          missing_docs = $2
        WHERE id = $1
      `;
      
      const missingDocs = app.missing_required && app.missing_required.length > 0;
      await pool.query(updateQuery, [applicationId, missingDocs]);
      
      res.json({
        success: true,
        application: {
          id: app.id,
          status: app.status,
          tenant: app.tenant,
          // Enhanced business data
          businessName: app.business_name || app.legal_business_name || app.dba_name,
          industry: app.business_industry || app.industry,
          businessType: app.business_business_type || app.business_type,
          annualRevenue: app.business_annual_revenue || app.annual_revenue,
          employeeCount: app.business_employee_count || app.number_of_employees,
          yearsInBusiness: app.years_in_business,
          address: app.business_business_address || app.business_address,
          website: app.business_website || app.website,
          // Contact information
          email: app.business_business_email || app.business_email || app.contact_email,
          phone: app.business_business_phone || app.business_phone || app.contact_phone,
          contactFirstName: app.contact_first_name || app.owner_first_name,
          contactLastName: app.contact_last_name || app.owner_last_name,
          // Financial information
          requestedAmount: app.requested_amount || app.amount_requested || app.loan_amount,
          useOfFunds: app.use_of_funds,
          // Document information
          documents: app.documents || [],
          documentCount: app.document_count || 0,
          verifiedCount: app.verified_count || 0,
          pendingCount: app.pending_count || 0,
          missingRequired: app.missing_required || [],
          // Metadata
          createdAt: app.created_at,
          updatedAt: new Date().toISOString(),
          lenderId: app.lender_id,
          productId: app.product_id
        }
      });
      
    } catch (error: unknown) {
      console.error('Error refreshing application:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh application',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  });

  console.log('✅ Application refresh endpoints mounted');
}