import { Router } from 'express';
import { queueAIJob, getJobStatus, cancelJob } from '../lib/aiQueue';

const router = Router();

// Get job status
router.get('/jobs/:requestId', async (req: any, res: any) => {
  try {
    const { requestId } = req.params;
    const job = await getJobStatus(requestId);
    
    if (!job) {
      return res.status(404).json({ ok: false, error: 'Job not found' });
    }
    
    const response: any = {
      ok: true,
      status: job.status,
      createdAt: job.createdAt,
      started_at: job.started_at,
      completed_at: job.completed_at
    };
    
    if (job.result_data) {
      response.result = JSON.parse(job.result_data);
    }
    
    if (job.error_message) {
      response.error = job.error_message;
    }
    
    res.json(response);
  } catch (error: any) {
    console.error('Error getting job status:', error);
    res.status(500).json({ ok: false, error: 'Failed to get job status' });
  }
});

// Cancel job
router.post('/jobs/:requestId/cancel', async (req: any, res: any) => {
  try {
    const { requestId } = req.params;
    const success = await cancelJob(requestId);
    
    if (success) {
      res.json({ ok: true, message: 'Job cancelled' });
    } else {
      res.status(500).json({ ok: false, error: 'Failed to cancel job' });
    }
  } catch (error: any) {
    console.error('Error cancelling job:', error);
    res.status(500).json({ ok: false, error: 'Failed to cancel job' });
  }
});

export default router;