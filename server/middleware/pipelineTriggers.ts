/**
 * 🎯 PIPELINE TRIGGER MIDDLEWARE
 * 
 * Middleware to automatically trigger pipeline stage evaluation
 * when documents are uploaded, deleted, or status changed.
 */

import PipelineService from '../services/pipelineService';

export function triggerPipelineOnDocumentChange(changeType: 'upload' | 'status_change' | 'delete') {
  return async (req: any, res: any, next: any) => {
    try {
      // Store original response methods
      const originalSend = res.send;
      const originalJson = res.json;
      
      // Override response methods to trigger pipeline after successful response
      res.send = function(data: any) {
        const result = originalSend.call(this, data);
        triggerPipelineAsync(req, changeType);
        return result;
      };
      
      res.json = function(data: any) {
        const result = originalJson.call(this, data);
        triggerPipelineAsync(req, changeType);
        return result;
      };
      
      next();
      
    } catch (error) {
      console.error('❌ [PIPELINE TRIGGER] Middleware error:', error);
      next();
    }
  };
}

async function triggerPipelineAsync(req: any, changeType: 'upload' | 'status_change' | 'delete') {
  try {
    // Extract application ID from various possible locations
    const applicationId = req.params.applicationId || 
                         req.params.id || 
                         req.body.applicationId || 
                         req.body.application_id;
    
    if (applicationId) {
      console.log(`🎯 [PIPELINE TRIGGER] Document ${changeType} detected for ${applicationId}`);
      
      // Trigger pipeline evaluation asynchronously (don't wait)
      PipelineService.onDocumentChange(applicationId, changeType).catch(error => {
        console.error('❌ [PIPELINE TRIGGER] Error in async processing:', error);
      });
    }
    
  } catch (error) {
    console.error('❌ [PIPELINE TRIGGER] Error extracting application ID:', error);
  }
}

export default {
  triggerPipelineOnDocumentChange
};