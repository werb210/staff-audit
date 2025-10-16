/**
 * Document Upload Stage Updater Middleware
 * Automatically triggers pipeline evaluation when documents are uploaded
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to trigger pipeline evaluation after document uploads
 */
export function createDocumentUploadStageUpdater() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json.bind(res);
    
    res.json = function(body: any) {
      // Check if this was a successful document upload
      if (body && body.success && body.document && body.document.application_id) {
        const applicationId = body.document.application_id;
        
        console.log(`📄 [DOC-UPLOAD-STAGE] Document uploaded for application: ${applicationId}`);
        
        // Trigger pipeline evaluation asynchronously (don't wait)
        import('../services/pipelineService.js').then(({ PipelineService }) => {
          PipelineService.evaluateAndUpdateStage(applicationId)
            .then((result) => {
              if (result.stageUpdated) {
                console.log(`✅ [DOC-UPLOAD-STAGE] Stage updated after upload: ${applicationId} → ${result.evaluation.suggestedStage}`);
              } else {
                console.log(`⏭️ [DOC-UPLOAD-STAGE] No stage change needed for: ${applicationId}`);
              }
            })
            .catch((error) => {
              console.error(`❌ [DOC-UPLOAD-STAGE] Pipeline evaluation failed for ${applicationId}:`, error);
            });
        }).catch((importError) => {
          console.error(`❌ [DOC-UPLOAD-STAGE] Failed to import PipelineService:`, importError);
        });
      }
      
      // Call original res.json with the response
      return originalJson(body);
    };
    
    next();
  };
}

/**
 * Middleware for document acceptance triggers
 */
export function createDocumentAcceptanceStageUpdater() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json.bind(res);
    
    res.json = function(body: any) {
      // Check if this was a successful document acceptance
      if (body && body.success && (req.path.includes('/accept') || req.path.includes('/reject'))) {
        const applicationId = req.params.applicationId || body.applicationId;
        
        if (applicationId) {
          console.log(`📋 [DOC-ACCEPT-STAGE] Document acceptance/rejection for application: ${applicationId}`);
          
          // Trigger pipeline evaluation asynchronously 
          setTimeout(() => {
            import('../services/pipelineService.js').then(({ PipelineService }) => {
              PipelineService.evaluateAndUpdateStage(applicationId)
                .then((result) => {
                  if (result.stageUpdated) {
                    console.log(`✅ [DOC-ACCEPT-STAGE] Stage updated after document decision: ${applicationId} → ${result.evaluation.suggestedStage}`);
                  } else {
                    console.log(`⏭️ [DOC-ACCEPT-STAGE] No stage change needed for: ${applicationId}`);
                  }
                })
                .catch((error) => {
                  console.error(`❌ [DOC-ACCEPT-STAGE] Pipeline evaluation failed for ${applicationId}:`, error);
                });
            }).catch((importError) => {
              console.error(`❌ [DOC-ACCEPT-STAGE] Failed to import PipelineService:`, importError);
            });
          }, 1000); // Small delay to ensure database updates are committed
        }
      }
      
      // Call original res.json with the response
      return originalJson(body);
    };
    
    next();
  };
}