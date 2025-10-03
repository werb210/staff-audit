import express from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/rbac';
import { checkDocumentIntegrity } from '../../utils/documentIntegrity';
import type { RBACRequest } from '../middleware/rbac';

const router = express.Router();

// GET /api/admin/document-audit - Get document integrity status
router.get('/document-audit', async (req: any, res: any) => requireRole(['admin', 'staff']), async (req: RBACRequest, res) => {
  try {
    console.log('🔍 ADMIN: Document audit requested', {
      user: req.user?.email,
      role: req.user?.role,
      timestamp: new Date().toISOString()
    });

    const report = await checkDocumentIntegrity();
    
    // Calculate health score
    const healthScore = report.totalDocuments === 0 ? 100 : 
      Math.round((report.summary.documentsWithFiles / report.totalDocuments) * 100);
    
    const auditResult = {
      timestamp: new Date().toISOString(),
      healthScore,
      status: healthScore >= 95 ? 'healthy' : healthScore >= 80 ? 'warning' : 'critical',
      summary: {
        totalDocuments: report.totalDocuments,
        documentsWithFiles: report.summary.documentsWithFiles,
        documentsWithoutFiles: report.summary.documentsWithoutFiles,
        orphanedFiles: report.summary.filesWithoutDatabase
      },
      issues: {
        missingFiles: report.missingFiles.map(file => ({
          documentId: file.id,
          fileName: file.fileName,
          applicationId: file.applicationId,
          createdAt: file.createdAt,
          severity: 'high'
        })),
        orphanedFiles: report.orphanedFiles.map(file => ({
          fileName: file,
          severity: 'medium',
          suggestion: 'Consider removing unused file from disk'
        }))
      },
      recommendations: generateRecommendations(report),
      auditedBy: req.user?.email
    };

    console.log('✅ ADMIN: Document audit completed', {
      healthScore,
      status: auditResult.status,
      totalIssues: auditResult.issues.missingFiles.length + auditResult.issues.orphanedFiles.length,
      user: req.user?.email
    });

    res.json({
      success: true,
      audit: auditResult
    });
  } catch (error: unknown) {
    console.error('❌ ADMIN: Document audit failed:', error);
    res.status(500).json({
      error: 'Failed to perform document audit',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

function generateRecommendations(report: any): string[] {
  const recommendations = [];
  
  if (report.missingFiles.length > 0) {
    recommendations.push('Contact clients to re-upload missing documents');
    recommendations.push('Consider removing orphaned database records for missing files');
  }
  
  if (report.orphanedFiles.length > 0) {
    recommendations.push('Review and clean up orphaned files to free disk space');
  }
  
  if (report.totalDocuments === 0) {
    recommendations.push('System ready for document uploads');
  } else if (report.summary.documentsWithFiles === report.totalDocuments) {
    recommendations.push('Document system is healthy - all files accounted for');
  }
  
  return recommendations;
}

export default router;