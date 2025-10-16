/**
 * Automatic SMS Service for New Applications
 * 
 * Ensures all new applications without documents receive immediate SMS notifications
 */

import { db } from '../db';
import { applications, documents } from '@shared/schema';
import { eq, count } from 'drizzle-orm';

export class AutoSmsService {
  
  /**
   * Check and send SMS for new application if no documents
   */
  static async checkAndSendSmsForNewApplication(applicationId: string): Promise<void> {
    try {
      console.log(`📱 [AUTO-SMS-SERVICE] Checking application ${applicationId} for SMS trigger`);
      
      // Get application details
      const appResult = await db
        .select()
        .from(applications)
        .where(eq(applications.id, applicationId))
        .limit(1);
      
      if (!appResult || appResult.length === 0) {
        console.log(`⚠️ [AUTO-SMS-SERVICE] Application ${applicationId} not found`);
        return;
      }
      
      const application = appResult[0];
      console.log(`📋 [AUTO-SMS-SERVICE] Application found: ${(application.formData as any)?.step3?.businessName || 'Unknown'}`);
      
      // Count documents for this application
      const docCountResult = await db
        .select({ count: count() })
        .from(documents)
        .where(eq(documents.applicationId, applicationId));
        
      const docCount = docCountResult[0]?.count || 0;
      console.log(`📄 [AUTO-SMS-SERVICE] Application ${applicationId} has ${docCount} documents`);
      
      // If no documents, send missing docs SMS
      if (docCount === 0) {
        console.log(`📱 [AUTO-SMS-SERVICE] Sending missing docs SMS for ${applicationId}`);
        
        const { sendEnhancedSMS } = await import('../routes/enhancedSmsTemplates.js');
        const result = await sendEnhancedSMS(applicationId, 'submission_no_docs');
        
        if (result.success) {
          console.log(`✅ [AUTO-SMS-SERVICE] SMS sent successfully: ${result.smsId}`);
        } else {
          console.error(`❌ [AUTO-SMS-SERVICE] SMS failed:`, result.error);
        }
      } else {
        console.log(`⏭️ [AUTO-SMS-SERVICE] Application has ${docCount} documents, no SMS needed`);
      }
      
    } catch (error) {
      console.error(`❌ [AUTO-SMS-SERVICE] Error processing ${applicationId}:`, error);
    }
  }
  
  /**
   * Trigger automatic pipeline evaluation for applications with stage/document mismatches
   */
  static async triggerPipelineEvaluationForStageMismatch(applicationId: string): Promise<void> {
    try {
      console.log(`🔧 [AUTO-SMS-SERVICE] Triggering pipeline evaluation for ${applicationId}`);
      
      // Use pipeline service to evaluate and update stage
      const { PipelineService } = await import('./pipelineService.js');
      const result = await PipelineService.evaluateAndUpdateStage(applicationId);
      
      if (result.stageUpdated) {
        console.log(`✅ [AUTO-SMS-SERVICE] Pipeline updated: ${result.evaluation.currentStage} → ${result.evaluation.suggestedStage}`);
      } else {
        console.log(`⏭️ [AUTO-SMS-SERVICE] No pipeline update needed for ${applicationId}`);
      }
      
    } catch (error) {
      console.error(`❌ [AUTO-SMS-SERVICE] Pipeline evaluation error for ${applicationId}:`, error);
    }
  }
  
  /**
   * Comprehensive check for new applications - triggers both SMS and pipeline evaluation
   */
  static async processNewApplication(applicationId: string): Promise<void> {
    try {
      console.log(`🚀 [AUTO-SMS-SERVICE] Processing new application: ${applicationId}`);
      
      // Wait a moment for database operations to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check and send SMS if needed
      await this.checkAndSendSmsForNewApplication(applicationId);
      
      // Trigger pipeline evaluation
      await this.triggerPipelineEvaluationForStageMismatch(applicationId);
      
      console.log(`✅ [AUTO-SMS-SERVICE] New application processing completed: ${applicationId}`);
      
    } catch (error) {
      console.error(`❌ [AUTO-SMS-SERVICE] Error processing new application ${applicationId}:`, error);
    }
  }
}