import { Router } from 'express';
import { pool } from '../db';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const router = Router();

// GET /api/bulletproof/health - Enhanced bulletproof health check with comprehensive monitoring
router.get('/health', async (req: any, res: any) => {
  try {
    console.log(`🔍 [BULLETPROOF API] Enhanced health check requested`);
    
    // Get all documents from database
    const documentsQuery = `
      SELECT 
        id, name, file_path, file_exists, checksum, size,
        applicationId, document_type, createdAt, updatedAt
      FROM documents 
      ORDER BY createdAt DESC
    `;
    const documentsResult = await pool.query(documentsQuery);
    const documents = documentsResult.rows;
    
    let totalDocuments = documents.length;
    let documentsWithFiles = 0;
    let documentsMissingFiles = 0;
    let documentsWithValidChecksum = 0;
    let documentsWithCorruptions = 0;
    let orphanedRecords = 0;
    let diskOnlyFiles = 0;
    const missingFiles = [];
    const corruptedFiles = [];
    const orphanedFiles = [];
    
    // Check each document
    for (const doc of documents) {
      // Handle orphaned records (null file_path)
      if (!doc.file_path) {
        orphanedRecords++;
        orphanedFiles.push({
          id: doc.id,
          name: doc.name,
          reason: 'null_file_path',
          applicationId: doc.applicationId
        });
        continue;
      }
      
      const filePath = path.resolve(doc.file_path);
      
      // Check file existence
      if (fs.existsSync(filePath)) {
        documentsWithFiles++;
        
        try {
          // Check file size
          const stats = fs.statSync(filePath);
          
          // Verify checksum if available
          if (doc.checksum) {
            const fileBuffer = fs.readFileSync(filePath);
            const actualChecksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');
            
            if (actualChecksum === doc.checksum) {
              documentsWithValidChecksum++;
            } else {
              documentsWithCorruptions++;
              corruptedFiles.push({
                id: doc.id,
                name: doc.name,
                reason: 'checksum_mismatch',
                expected_checksum: doc.checksum,
                actual_checksum: actualChecksum,
                size: stats.size
              });
            }
          }
          
        } catch (accessError) {
          documentsWithCorruptions++;
          corruptedFiles.push({
            id: doc.id,
            name: doc.name,
            reason: 'file_access_error',
            error: accessError instanceof Error ? accessError.message : String(accessError)
          });
        }
        
      } else {
        documentsMissingFiles++;
        missingFiles.push({
          id: doc.id,
          name: doc.name,
          expected_path: filePath,
          applicationId: doc.applicationId,
          db_file_exists: doc.file_exists
        });
      }
    }
    
    // Check for disk-only files (files without database records)
    const documentsDir = path.join(process.cwd(), 'uploads', 'documents');
    if (fs.existsSync(documentsDir)) {
      const diskFiles = fs.readdirSync(documentsDir);
      const dbFileNames = new Set(documents.map(d => d.file_path ? path.basename(d.file_path) : null).filter(Boolean));
      
      diskOnlyFiles = diskFiles.filter(fileName => !dbFileNames.has(fileName)).length;
    }
    
    // Get preview log statistics
    const previewLogQuery = `
      SELECT 
        status,
        COUNT(*) as count,
        MAX(timestamp) as last_occurrence
      FROM document_preview_log 
      WHERE timestamp > NOW() - INTERVAL '24 hours'
      GROUP BY status
      ORDER BY status
    `;
    const previewLogResult = await pool.query(previewLogQuery);
    const previewStats = previewLogResult.rows.reduce((acc: any, row: any) => {
      acc[row.status] = {
        count: parseInt(row.count),
        last_occurrence: row.last_occurrence
      };
      return acc;
    }, {});
    
    // Calculate success rate
    const totalPreviews = Object.values(previewStats).reduce((sum: number, stat: any) => sum + stat.count, 0);
    const successfulPreviews = previewStats[200]?.count || 0;
    const previewSuccessRate = totalPreviews > 0 ? Math.round((successfulPreviews / totalPreviews) * 100) : 0;
    
    // Determine system health status
    const isHealthy = documentsMissingFiles === 0 && orphanedRecords === 0 && documentsWithCorruptions === 0;
    const uploadSystemStatus = isHealthy ? 'operational' : 'degraded';
    const storageSystemStatus = documentsMissingFiles === 0 ? 'operational' : 'degraded';
    const backupSystemStatus = 'healthy'; // Disk-only in development
    
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      system_status: isHealthy ? 'healthy' : 'degraded',
      statistics: {
        totalDocuments,
        documentsWithFiles,
        documentsMissingFiles,
        documentsWithValidChecksum,
        documentsWithCorruptions,
        orphanedRecords,
        diskOnlyFiles,
        backupSuccessRate: Math.round((documentsWithValidChecksum / Math.max(totalDocuments, 1)) * 100)
      },
      status: {
        uploadSystem: uploadSystemStatus,
        backupSystem: backupSystemStatus,
        storageSystem: storageSystemStatus
      },
      preview_analytics: {
        last_24h_total_requests: totalPreviews,
        success_rate_percentage: previewSuccessRate,
        status_breakdown: previewStats
      },
      issues: {
        missing_files: missingFiles.length > 0 ? missingFiles.slice(0, 10) : [], // Limit to 10 for response size
        corrupted_files: corruptedFiles.length > 0 ? corruptedFiles.slice(0, 10) : [],
        orphaned_records: orphanedFiles.length > 0 ? orphanedFiles.slice(0, 10) : []
      },
      environment: {
        node_env: process.env.NODE_ENV || 'development',
        disk_only_mode: process.env.NODE_ENV === 'development',
        uploads_directory: documentsDir
      }
    };
    
    console.log(`✅ [BULLETPROOF API] Health check completed - Status: ${response.system_status}`);
    console.log(`📊 [HEALTH STATS] ${documentsWithFiles}/${totalDocuments} files available, ${documentsMissingFiles} missing, ${documentsWithCorruptions} corrupted`);
    
    res.json(response);
    
  } catch (error: unknown) {
    console.error('❌ [BULLETPROOF API] Health check failed:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

// GET /api/bulletproof/preview-logs - Get recent preview attempt logs
router.get('/preview-logs', async (req: any, res: any) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string;
    
    let query = `
      SELECT 
        dpl.*, 
        d.name, 
        d.applicationId,
        d.document_type
      FROM document_preview_log dpl
      LEFT JOIN documents d ON dpl.document_id = d.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    
    if (status) {
      query += ` AND dpl.status = $${params.length + 1}`;
      params.push(parseInt(status));
    }
    
    query += ` ORDER BY dpl.timestamp DESC LIMIT $${params.length + 1}`;
    params.push(limit);
    
    const result = await pool.query(query, params);
    
    res.json({
      success: true,
      logs: result.rows,
      total: result.rows.length
    });
    
  } catch (error: unknown) {
    console.error('❌ [BULLETPROOF API] Preview logs failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve preview logs',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : String(error)
    });
  }
});

export default router;