/**
 * 🚀 AUTOMATED SALES PIPELINE SERVICE
 *
 * Automatically moves applications between pipeline stages based on document status
 * and business rules. Triggered on document changes and status updates.
 *
 * Pipeline Stages:
 * - New: Just submitted, no actions taken
 * - Requires Docs: Missing or rejected documents
 * - In Review: All docs accepted, ready for review
 * - Off to Lender: Submitted to lender(s)
 * - Accepted: Approved by lender
 * - Denied: Rejected or withdrawn
 */
import { db } from '../db';
import { getGlobalIo } from '../websocket';
import { applications, documents } from '@shared/schema';
// Note: expectedDocuments import temporarily removed due to production compilation issue
import { eq, ne, desc, count, sql } from 'drizzle-orm';
export class PipelineService {
    /**
     * Evaluate what stage an application should be in based on current data
     */
    static async evaluateApplicationStage(applicationId) {
        try {
            console.log(`🔍 [PIPELINE] Evaluating stage for application: ${applicationId}`);
            // Get application data
            const appResult = await db
                .select({
                id: applications.id,
                stage: sql `stage`,
                status: applications.status,
                createdAt: applications.createdAt
            })
                .from(applications)
                .where(eq(applications.id, applicationId))
                .limit(1);
            if (!appResult || appResult.length === 0) {
                throw new Error('Application not found');
            }
            const application = appResult[0];
            const currentStage = application.stage || 'New';
            // Get document statistics
            const docResult = await db
                .select({
                totalDocs: count(),
                acceptedDocs: sql `COUNT(CASE WHEN ${sql.raw(`status`)} = 'accepted' THEN 1 END)`,
                rejectedDocs: sql `COUNT(CASE WHEN ${sql.raw(`status`)} = 'rejected' THEN 1 END)`,
                pendingDocs: sql `COUNT(CASE WHEN ${sql.raw(`status`)} = 'pending' THEN 1 END)`
            })
                .from(documents)
                .where(eq(documents.applicationId, applicationId));
            const docStats = docResult[0];
            const totalDocs = Number(docStats.totalDocs) || 0;
            const acceptedDocs = Number(docStats.acceptedDocs) || 0;
            const rejectedDocs = Number(docStats.rejectedDocs) || 0;
            const pendingDocs = Number(docStats.pendingDocs) || 0;
            // Get expected documents count using raw SQL to avoid import issues
            const expectedResult = await db.execute(sql `
        SELECT COUNT(*) as count 
        FROM expected_documents 
        WHERE applicationId = ${applicationId}
      `);
            const expectedCount = Number(expectedResult.rows[0]?.count) || 0;
            const missingDocs = Math.max(0, expectedCount - totalDocs);
            console.log(`📊 [PIPELINE] Document stats - Total: ${totalDocs}, Accepted: ${acceptedDocs}, Rejected: ${rejectedDocs}, Pending: ${pendingDocs}, Missing: ${missingDocs}`);
            // CORRECTED PIPELINE RULES: Strict enforcement per user requirements
            let suggestedStage = currentStage;
            let reason = 'No change needed';
            // CRITICAL ENFORCEMENT: Block any "Off to Lender" without documents
            if (currentStage === 'Off to Lender' && totalDocs === 0) {
                suggestedStage = 'Requires Docs';
                reason = 'PIPELINE MISCLASSIFICATION FIX: Cannot be "Off to Lender" with 0 documents';
            }
            // CRITICAL ENFORCEMENT: Block "Off to Lender" with rejected or pending docs
            else if (currentStage === 'Off to Lender' && (rejectedDocs > 0 || pendingDocs > 0)) {
                if (rejectedDocs > 0) {
                    suggestedStage = 'Requires Docs';
                    reason = `PIPELINE FIX: Cannot be "Off to Lender" with ${rejectedDocs} rejected documents`;
                }
                else {
                    suggestedStage = 'In Review';
                    reason = `PIPELINE FIX: Cannot be "Off to Lender" with ${pendingDocs} pending documents`;
                }
            }
            // Rule 1: Applications with no documents → "Requires Docs"
            else if (totalDocs === 0) {
                suggestedStage = 'Requires Docs';
                reason = 'No documents uploaded - requires document submission';
            }
            // Rule 2: Documents uploaded but not all accepted → Manual review required
            else if (totalDocs > 0 && acceptedDocs < totalDocs) {
                if (rejectedDocs > 0) {
                    suggestedStage = 'Requires Docs';
                    reason = `${rejectedDocs} document(s) rejected - requires resubmission`;
                }
                else {
                    suggestedStage = 'In Review';
                    reason = `${pendingDocs} document(s) pending review - staff review required`;
                }
            }
            // Rule 3: All documents accepted → Ready for manual "Send to Lender" action
            else if (totalDocs > 0 && acceptedDocs === totalDocs && rejectedDocs === 0 && pendingDocs === 0) {
                // DO NOT auto-advance to "Off to Lender" - require manual staff action
                if (currentStage !== 'Off to Lender') {
                    suggestedStage = 'In Review';
                    reason = `All ${acceptedDocs} documents accepted - ready for manual lender submission`;
                }
            }
            const shouldUpdate = suggestedStage !== currentStage;
            const evaluation = {
                currentStage,
                suggestedStage,
                reason,
                shouldUpdate,
                documentStats: {
                    total: totalDocs,
                    accepted: acceptedDocs,
                    rejected: rejectedDocs,
                    pending: pendingDocs,
                    missing: missingDocs
                }
            };
            console.log(`✅ [PIPELINE] Evaluation complete:`, evaluation);
            return evaluation;
        }
        catch (error) {
            console.error('❌ [PIPELINE] Error evaluating application stage:', error);
            throw error;
        }
    }
    /**
     * Evaluate and update application stage in one operation
     */
    static async evaluateAndUpdateStage(applicationId) {
        try {
            console.log(`🔄 [PIPELINE] Evaluating and updating stage for application: ${applicationId}`);
            const evaluation = await this.evaluateApplicationStage(applicationId);
            if (evaluation.shouldUpdate) {
                console.log(`🔄 [PIPELINE] Stage needs update: ${evaluation.currentStage} → ${evaluation.suggestedStage}`);
                // Update application stage
                const { sql } = await import('drizzle-orm');
                const { db } = await import('../db');
                await db.execute(sql `
          UPDATE applications 
          SET 
            stage = ${evaluation.suggestedStage},
            updatedAt = NOW()
          WHERE id = ${applicationId}
        `);
                console.log(`✅ [PIPELINE] Application ${applicationId} stage updated to: ${evaluation.suggestedStage}`);
                // Trigger SMS notification based on new stage
                try {
                    const smsTemplateMap = {
                        'Requires Docs': 'submission_no_docs',
                        'In Review': 'in_review',
                        'Send to Lender': 'all_docs_accepted',
                        'Sent to Lender': 'sent_to_lender'
                    };
                    const templateType = smsTemplateMap[evaluation.suggestedStage];
                    if (templateType) {
                        console.log(`📱 [PIPELINE] Triggering SMS: ${templateType} for stage: ${evaluation.suggestedStage}`);
                        // Import and send SMS asynchronously
                        import('../routes/enhancedSmsTemplates').then(({ sendEnhancedSMS }) => {
                            sendEnhancedSMS(applicationId, templateType)
                                .then((result) => {
                                if (result.success) {
                                    console.log(`✅ [PIPELINE] SMS sent for stage transition: ${evaluation.currentStage} → ${evaluation.suggestedStage}`);
                                }
                                else {
                                    console.error(`❌ [PIPELINE] SMS failed for stage transition:`, result.error);
                                }
                            })
                                .catch((error) => {
                                console.error(`❌ [PIPELINE] SMS error for stage transition:`, error);
                            });
                        }).catch((importError) => {
                            console.error(`❌ [PIPELINE] Failed to import SMS service:`, importError);
                        });
                    }
                }
                catch (smsError) {
                    console.error(`❌ [PIPELINE] SMS notification error:`, smsError);
                    // Don't fail pipeline update if SMS fails
                }
                return {
                    success: true,
                    message: `Stage updated from ${evaluation.currentStage} to ${evaluation.suggestedStage}`,
                    evaluation,
                    stageUpdated: true
                };
            }
            else {
                console.log(`⏭️ [PIPELINE] No stage update needed for application: ${applicationId}`);
                return {
                    success: true,
                    message: 'No stage update needed',
                    evaluation,
                    stageUpdated: false
                };
            }
        }
        catch (error) {
            console.error('❌ [PIPELINE] Error in evaluateAndUpdateStage:', error);
            throw error;
        }
    }
    /**
     * Update application stage based on evaluation
     */
    static async updateApplicationStage(applicationId, evaluation) {
        try {
            if (!evaluation.shouldUpdate) {
                console.log(`⏸️ [PIPELINE] No stage update needed for ${applicationId}`);
                return;
            }
            console.log(`🔄 [PIPELINE] Updating ${applicationId}: ${evaluation.currentStage} → ${evaluation.suggestedStage}`);
            // Update the stage in database
            await db
                .update(applications)
                .set({
                updatedAt: new Date()
            })
                .where(eq(applications.id, applicationId));
            // Update stage using raw SQL since stage column is not in schema
            await db.execute(sql `UPDATE applications SET stage = ${evaluation.suggestedStage}, updatedAt = CURRENT_TIMESTAMP WHERE id = ${applicationId}`);
            // Log the stage change using raw SQL since application_stage_history is not in schema
            await db.execute(sql `
        INSERT INTO application_stage_history (
          applicationId, previous_stage, new_stage, reason, changed_at
        ) VALUES (${applicationId}, ${evaluation.currentStage}, ${evaluation.suggestedStage}, ${evaluation.reason}, CURRENT_TIMESTAMP)
      `);
            console.log(`✅ [PIPELINE] Stage updated: ${applicationId} → ${evaluation.suggestedStage}`);
            // 📱 SMS INTEGRATION: Send stage transition SMS notification
            try {
                const { sendStageTransitionSMS } = await import('../routes/smsStageNotifications');
                console.log(`📱 [PIPELINE] Triggering SMS for stage transition: ${evaluation.currentStage} → ${evaluation.suggestedStage}`);
                const smsResult = await sendStageTransitionSMS(applicationId, evaluation.currentStage, evaluation.suggestedStage);
                if (smsResult.success) {
                    console.log(`✅ [PIPELINE] SMS notification sent successfully for ${applicationId}`);
                }
                else {
                    console.log(`⚠️ [PIPELINE] SMS notification failed: ${smsResult.error}`);
                }
            }
            catch (smsError) {
                console.error(`❌ [PIPELINE] SMS integration error:`, smsError);
                // Don't fail the pipeline update if SMS fails
            }
            // Emit real-time update
            const io = getGlobalIo();
            if (io) {
                io.emit('pipeline:stage-changed', {
                    applicationId,
                    previousStage: evaluation.currentStage,
                    newStage: evaluation.suggestedStage,
                    reason: evaluation.reason,
                    timestamp: new Date().toISOString()
                });
                console.log(`📡 [PIPELINE] Real-time update sent for ${applicationId}`);
            }
        }
        catch (error) {
            console.error('❌ [PIPELINE] Error updating application stage:', error);
            throw error;
        }
    }
    /**
     * Main function: Evaluate and update application stage automatically
     */
    static async processApplicationStage(applicationId) {
        try {
            console.log(`🚀 [PIPELINE] Processing stage for application: ${applicationId}`);
            const evaluation = await this.evaluateApplicationStage(applicationId);
            if (evaluation.shouldUpdate) {
                await this.updateApplicationStage(applicationId, evaluation);
            }
            return evaluation;
        }
        catch (error) {
            console.error('❌ [PIPELINE] Error processing application stage:', error);
            throw error;
        }
    }
    /**
     * Trigger pipeline evaluation when documents change
     */
    static async onDocumentChange(applicationId, changeType) {
        try {
            console.log(`📄 [PIPELINE] Document ${changeType} detected for ${applicationId}`);
            // Wait a moment for database consistency
            await new Promise(resolve => setTimeout(resolve, 500));
            await this.processApplicationStage(applicationId);
        }
        catch (error) {
            console.error('❌ [PIPELINE] Error handling document change:', error);
        }
    }
    /**
     * Batch process all applications (for maintenance)
     */
    static async processAllApplications() {
        try {
            console.log('🔄 [PIPELINE] Starting batch processing of all applications...');
            const applicationsResult = await db
                .select({ id: applications.id })
                .from(applications)
                .where(ne(applications.status, 'declined'))
                .orderBy(desc(applications.createdAt));
            let processed = 0;
            let updated = 0;
            for (const app of applicationsResult) {
                try {
                    const evaluation = await this.processApplicationStage(app.id);
                    processed++;
                    if (evaluation.shouldUpdate) {
                        updated++;
                    }
                }
                catch (error) {
                    console.error(`❌ [PIPELINE] Error processing ${app.id}:`, error);
                }
            }
            console.log(`✅ [PIPELINE] Batch processing complete: ${processed} processed, ${updated} updated`);
        }
        catch (error) {
            console.error('❌ [PIPELINE] Error in batch processing:', error);
        }
    }
}
export default PipelineService;
