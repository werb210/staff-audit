import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { db } from '../db/drizzle';
import { sql } from 'drizzle-orm';

// Redis connection for BullMQ
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  retryDelayOnFailover: 100,
});

// AI Job Queue
export const aiQueue = new Queue('ai-processing', {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

interface AIJobData {
  requestId: string;
  action: string;
  applicationId?: string;
  contactId?: string;
  userId?: string;
  tenantId?: string;
  input: any;
}

// Job processor
const aiWorker = new Worker(
  'ai-processing',
  async (job: Job<AIJobData>) => {
    const { requestId, action, input } = job.data;
    
    try {
      // Update job status to running
      await updateJobStatus(requestId, 'running');
      
      // Process based on action type
      let result;
      switch (action) {
        case 'scan_docs':
          result = await processDocumentScan(input);
          break;
        case 'ocr':
          result = await processOCR(input);
          break;
        case 'validate':
          result = await processValidation(input);
          break;
        case 'credit_summary':
          result = await processCreditSummary(input);
          break;
        default:
          throw new Error(`Unknown action: ${action}`);
      }
      
      // Update job status to completed
      await updateJobStatus(requestId, 'completed', result);
      
      return result;
      
    } catch (error: any) {
      // Update job status to failed
      await updateJobStatus(requestId, 'failed', null, error.message);
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: parseInt(process.env.AI_WORKER_CONCURRENCY || '3'),
  }
);

// Job management functions
export async function queueAIJob(data: AIJobData): Promise<string> {
  // Create job record in database
  await db.execute(sql`
    INSERT INTO ai_jobs (
      request_id, action, status, input_data, 
      application_id, contact_id, user_id, tenant_id
    ) VALUES (
      ${data.requestId}, ${data.action}, 'pending', ${JSON.stringify(data.input)},
      ${data.applicationId}, ${data.contactId}, ${data.userId}, ${data.tenantId}
    )
  `);
  
  // Add to queue
  const job = await aiQueue.add(`ai-${data.action}`, data, {
    jobId: data.requestId,
    delay: 0,
  });
  
  return data.requestId;
}

export async function getJobStatus(requestId: string) {
  const [job] = await db.execute(sql`
    SELECT status, result_data, error_message, created_at, started_at, completed_at
    FROM ai_jobs 
    WHERE request_id = ${requestId}
  `);
  
  return job || null;
}

export async function cancelJob(requestId: string): Promise<boolean> {
  try {
    // Remove from queue
    const job = await aiQueue.getJob(requestId);
    if (job) {
      await job.remove();
    }
    
    // Update database
    await updateJobStatus(requestId, 'cancelled');
    
    return true;
  } catch (error) {
    console.error('Failed to cancel job:', error);
    return false;
  }
}

async function updateJobStatus(
  requestId: string, 
  status: string, 
  result?: any, 
  error?: string
) {
  const updates: any = { status };
  
  if (status === 'running') {
    updates.started_at = new Date();
  } else if (status === 'completed' || status === 'failed' || status === 'cancelled') {
    updates.completed_at = new Date();
  }
  
  if (result) {
    updates.result_data = JSON.stringify(result);
  }
  
  if (error) {
    updates.error_message = error;
  }
  
  await db.execute(sql`
    UPDATE ai_jobs 
    SET 
      status = ${status},
      ${status === 'running' ? sql`started_at = NOW(),` : sql``}
      ${(status === 'completed' || status === 'failed' || status === 'cancelled') ? sql`completed_at = NOW(),` : sql``}
      ${result ? sql`result_data = ${JSON.stringify(result)},` : sql``}
      ${error ? sql`error_message = ${error},` : sql``}
      updated_at = NOW()
    WHERE request_id = ${requestId}
  `);
}

// AI Processing Functions (implement actual AI logic here)
async function processDocumentScan(input: any) {
  // Simulate document scanning - replace with actual AI logic
  await new Promise(resolve => setTimeout(resolve, 5000)); // Simulate processing time
  
  return {
    missing: ['Bank Statement (last 3 months)', 'Business License'],
    quality: [
      { document: 'Tax Return 2023', score: 0.95, issues: [] },
      { document: 'Financial Statement', score: 0.78, issues: ['Partially obscured text'] }
    ],
    total_documents: 5,
    processed_documents: 3
  };
}

async function processOCR(input: any) {
  // Simulate OCR processing
  await new Promise(resolve => setTimeout(resolve, 10000));
  
  return {
    extracted_text: 'Sample extracted text...',
    confidence: 0.92,
    fields: {
      business_name: 'Acme Corp',
      revenue: '$500,000',
      date: '2023-12-31'
    }
  };
}

async function processValidation(input: any) {
  // Simulate validation processing
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return {
    issues: [
      {
        type: 'inconsistency',
        severity: 'medium',
        description: 'Business name mismatch between tax return and bank statement',
        documents: ['tax_return.pdf', 'bank_statement.pdf']
      }
    ],
    validated_fields: 12,
    total_fields: 15
  };
}

async function processCreditSummary(input: any) {
  // Simulate credit summary generation
  await new Promise(resolve => setTimeout(resolve, 8000));
  
  return {
    summary: 'Strong business with consistent revenue growth...',
    score: 82,
    recommendation: 'Approve with standard terms',
    risk_factors: ['Seasonal revenue fluctuation'],
    strengths: ['Strong cash flow', 'Experienced management']
  };
}

// Cleanup old jobs
export async function cleanupOldJobs() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 7); // Keep jobs for 7 days
  
  await db.execute(sql`
    DELETE FROM ai_jobs 
    WHERE created_at < ${cutoffDate} 
    AND status IN ('completed', 'failed', 'cancelled')
  `);
}

// Error handling
aiWorker.on('error', (error) => {
  console.error('AI Worker error:', error);
});

aiWorker.on('failed', (job, error) => {
  console.error(`AI Job ${job?.id} failed:`, error);
});

export { aiWorker };