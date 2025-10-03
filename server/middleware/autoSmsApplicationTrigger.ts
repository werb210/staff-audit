/**
 * Automatic SMS Application Trigger Middleware
 * 
 * Automatically triggers SMS notifications for new applications without documents
 * This ensures every new application gets immediate SMS notification regardless of stage
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to trigger automatic SMS for new applications without documents
 */
export function createAutoSmsApplicationTrigger() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json.bind(res);
    
    res.json = function(body: any) {
      // Check if this was a successful application creation
      if (body && body.success && body.application && body.application.id) {
        const applicationId = body.application.id;
        
        console.log(`🆕 [AUTO-SMS-TRIGGER] New application created: ${applicationId}`);
        
        // Trigger automatic SMS check for new applications
        setTimeout(async () => {
          try {
            console.log(`📱 [AUTO-SMS-TRIGGER] Checking if SMS needed for new application: ${applicationId}`);
            
            // Import database and check document count
            const { db } = await import('../db');
            const { documents } = await import('@shared/schema');
            const { eq, count } = await import('drizzle-orm');
            
            // Count accepted documents for this application
            const docCountResult = await db
              .select({ count: count() })
              .from(documents)
              .where(eq(documents.applicationId, applicationId));
              
            const docCount = docCountResult[0]?.count || 0;
            
            console.log(`📋 [AUTO-SMS-TRIGGER] Application ${applicationId} has ${docCount} documents`);
            
            // If no documents, send missing docs SMS immediately
            if (docCount === 0) {
              console.log(`📱 [AUTO-SMS-TRIGGER] Sending missing docs SMS for new application: ${applicationId}`);
              
              const { sendEnhancedSMS } = await import('../routes/enhancedSmsTemplates.js');
              const result = await sendEnhancedSMS(applicationId, 'submission_no_docs');
              
              if (result.success) {
                console.log(`✅ [AUTO-SMS-TRIGGER] Missing docs SMS sent successfully for ${applicationId}: ${result.smsId}`);
              } else {
                console.error(`❌ [AUTO-SMS-TRIGGER] Failed to send SMS for ${applicationId}:`, result.error);
              }
            } else {
              console.log(`⏭️ [AUTO-SMS-TRIGGER] Application ${applicationId} has ${docCount} documents, no SMS needed`);
            }
            
          } catch (error) {
            console.error(`❌ [AUTO-SMS-TRIGGER] Error processing new application ${applicationId}:`, error);
          }
        }, 2000); // 2-second delay to allow application to be fully saved
      }
      
      // Call original res.json with the response
      return originalJson(body);
    };
    
    next();
  };
}

/**
 * Enhanced trigger that also handles stage corrections
 */
export function createAutoSmsStageCorrection() {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json to intercept successful responses
    const originalJson = res.json.bind(res);
    
    res.json = function(body: any) {
      // Check if this involves application data with potential stage issues
      if (body && Array.isArray(body) && body.length > 0 && body[0].id) {
        // This looks like the applications list response
        body.forEach((application: any) => {
          const { id, stage, totalDocs } = application;
          
          // Check for stage/document mismatches
          if (stage === 'Off to Lender' && totalDocs === 0) {
            console.log(`🔧 [AUTO-SMS-STAGE] Stage correction needed for ${id}: ${stage} with ${totalDocs} docs`);
            
            // Trigger pipeline evaluation and SMS
            setTimeout(async () => {
              try {
                const { PipelineService } = await import('../services/pipelineService.js');
                const result = await PipelineService.evaluateAndUpdateStage(id);
                
                if (result.stageUpdated) {
                  console.log(`✅ [AUTO-SMS-STAGE] Stage corrected and SMS sent for ${id}`);
                }
              } catch (error) {
                console.error(`❌ [AUTO-SMS-STAGE] Error correcting stage for ${id}:`, error);
              }
            }, 1000);
          }
        });
      }
      
      // Call original res.json with the response
      return originalJson(body);
    };
    
    next();
  };
}