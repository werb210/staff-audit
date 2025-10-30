import { db } from '../db';
import { retryUploadLogs } from '../../shared/schema';
import { desc } from 'drizzle-orm';
class RetryQueueService {
    jobs = new Map();
    isProcessing = false;
    // Add job to retry queue
    async enqueue(job) {
        const jobId = `${job.jobType}_${job.applicationId}_${Date.now()}`;
        const retryJob = {
            id: jobId,
            attempt: 0,
            maxAttempts: job.maxAttempts || 3,
            retryDelay: job.retryDelay || 30000, // 30 seconds
            scheduledAt: new Date(Date.now() + (job.retryDelay || 30000)),
            ...job
        };
        this.jobs.set(jobId, retryJob);
        // Log the initial queue entry
        console.log(`[RETRY] Enqueued job: ${job.jobType} for app ${job.applicationId}`);
        // Start processing if not already running
        if (!this.isProcessing) {
            this.startProcessing();
        }
        return jobId;
    }
    // Log retry attempt to database
    async logRetryAttempt(job, error, success) {
        try {
            const logData = {
                applicationId: job.applicationId,
                fileName: job.fileName || `${job.jobType}_job`,
                documentType: job.documentType || 'other',
                errorMessage: error || job.lastError || 'Unknown error',
                attempt: job.attempt,
                retryScheduledAt: job.scheduledAt,
                retryCompletedAt: success ? new Date() : undefined,
                retrySuccess: success,
                finalErrorMessage: !success && job.attempt >= job.maxAttempts ? (error || 'Max attempts exceeded') : undefined
            };
            await db.insert(retryUploadLogs).values(logData);
            console.log(`[RETRY] ${success ? 'Success' : 'Failed'} job: ${job.jobType} for app ${job.applicationId}, attempt ${job.attempt}${error ? `, error: ${error}` : ''}`);
        }
        catch (dbError) {
            console.error('[RETRY] Failed to log retry attempt:', dbError);
        }
    }
    // Get retry logs for admin dashboard
    async getRetryLogs(limit = 50) {
        try {
            const logs = await db
                .select()
                .from(retryUploadLogs)
                .orderBy(desc(retryUploadLogs.createdAt))
                .limit(limit);
            return logs.map(log => ({
                id: log.id,
                applicationId: log.applicationId,
                fileName: log.fileName,
                documentType: log.documentType,
                attempt: log.attempt,
                errorMessage: log.errorMessage,
                retryScheduledAt: log.retryScheduledAt,
                retryCompletedAt: log.retryCompletedAt,
                retrySuccess: log.retrySuccess,
                finalErrorMessage: log.finalErrorMessage,
                createdAt: log.createdAt
            }));
        }
        catch (error) {
            console.error('[RETRY] Failed to fetch retry logs:', error);
            return [];
        }
    }
    // Process retry jobs
    async startProcessing() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        while (this.jobs.size > 0) {
            const now = new Date();
            const readyJobs = Array.from(this.jobs.values()).filter(job => job.scheduledAt && job.scheduledAt <= now);
            for (const job of readyJobs) {
                if (job.attempt >= job.maxAttempts) {
                    // Job has exceeded max attempts
                    await this.logRetryAttempt(job, 'Max retry attempts exceeded', false);
                    this.jobs.delete(job.id);
                    continue;
                }
                job.attempt++;
                let success = false;
                let error = '';
                try {
                    success = await this.processJob(job);
                }
                catch (err) {
                    error = err instanceof Error ? err.message : 'Unknown error';
                    job.lastError = error;
                }
                await this.logRetryAttempt(job, error, success);
                if (success) {
                    // Job completed successfully
                    this.jobs.delete(job.id);
                }
                else if (job.attempt < job.maxAttempts) {
                    // Schedule next retry with exponential backoff
                    const delay = job.retryDelay * Math.pow(2, job.attempt - 1);
                    job.scheduledAt = new Date(Date.now() + delay);
                }
                else {
                    // Max attempts exceeded
                    this.jobs.delete(job.id);
                }
            }
            // Wait before next processing cycle
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
        this.isProcessing = false;
    }
    // Process individual job based on type
    async processJob(job) {
        switch (job.jobType) {
            case 'documentUpload':
                return await this.processDocumentUpload(job);
            case 'ocrProcessing':
                return await this.processOcrJob(job);
            case 'emailSend':
                return await this.processEmailSend(job);
            case 'apiSync':
                return await this.processApiSync(job);
            default:
                throw new Error(`Unknown job type: ${job.jobType}`);
        }
    }
    async processDocumentUpload(job) {
        // Implement document upload retry logic
        console.log(`[RETRY] Processing document upload for app ${job.applicationId}`);
        // Placeholder for actual upload logic
        // This would typically involve calling the document upload service
        return Math.random() > 0.3; // Simulate 70% success rate
    }
    async processOcrJob(job) {
        // Implement OCR processing retry logic
        console.log(`[RETRY] Processing OCR for app ${job.applicationId}`);
        return Math.random() > 0.2; // Simulate 80% success rate
    }
    async processEmailSend(job) {
        // Implement email send retry logic
        console.log(`[RETRY] Processing email send for app ${job.applicationId}`);
        return Math.random() > 0.1; // Simulate 90% success rate
    }
    async processApiSync(job) {
        // Implement API sync retry logic
        console.log(`[RETRY] Processing API sync for app ${job.applicationId}`);
        return Math.random() > 0.4; // Simulate 60% success rate
    }
    // Manual retry from admin dashboard
    async retryJob(applicationId, jobType) {
        try {
            const job = {
                applicationId,
                jobType: jobType,
                payload: {},
                attempt: 0,
                maxAttempts: 1,
                retryDelay: 0
            };
            return await this.processJob(job);
        }
        catch (error) {
            console.error(`[RETRY] Manual retry failed:`, error);
            return false;
        }
    }
    // Get current queue status
    getQueueStatus() {
        return {
            totalJobs: this.jobs.size,
            isProcessing: this.isProcessing,
            jobs: Array.from(this.jobs.values()).map(job => ({
                id: job.id,
                applicationId: job.applicationId,
                jobType: job.jobType,
                attempt: job.attempt,
                maxAttempts: job.maxAttempts,
                scheduledAt: job.scheduledAt,
                lastError: job.lastError
            }))
        };
    }
}
export const retryQueue = new RetryQueueService();
