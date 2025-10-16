import { Router } from "express";
// REMOVED: requirePermission from authz service (authentication system deleted)
import { Queue } from "bullmq";

const router = Router();

// Only enable if Redis is available
const redisUrl = process.env.REDIS_URL;
const queuesEnabled = process.env.QUEUES_ENABLED === 'true' && redisUrl;

if (queuesEnabled) {
  // Initialize queues
  const queues = {
    'document-processing': new Queue('document-processing', { connection: redisUrl }),
    'email-notifications': new Queue('email-notifications', { connection: redisUrl }),
    'sms-notifications': new Queue('sms-notifications', { connection: redisUrl }),
    'ocr-processing': new Queue('ocr-processing', { connection: redisUrl }),
  };

  /* Get queue status and metrics */
  router.get("/queues", async (req: any, res) => {
    const queueStats = [];
    
    for (const [name, queue] of Object.entries(queues)) {
      try {
        const waiting = await queue.getWaiting();
        const active = await queue.getActive();
        const completed = await queue.getCompleted();
        const failed = await queue.getFailed();
        
        queueStats.push({
          name,
          waiting: waiting.length,
          active: active.length,
          completed: completed.length,
          failed: failed.length,
          total: waiting.length + active.length + completed.length + failed.length
        });
      } catch (error: unknown) {
        queueStats.push({
          name,
          error: 'Failed to get stats',
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          total: 0
        });
      }
    }
    
    res.json({ queuesEnabled: true, queues: queueStats });
  });

  /* Get jobs for a specific queue */
  router.get("/queues/:queueName/jobs", async (req: any, res) => {
    const { queueName } = req.params;
    const { status = 'waiting', limit = 50 } = req.query;
    
    const queue = queues[queueName];
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    
    try {
      let jobs;
      switch (status) {
        case 'waiting':
          jobs = await queue.getWaiting(0, limit - 1);
          break;
        case 'active':
          jobs = await queue.getActive(0, limit - 1);
          break;
        case 'completed':
          jobs = await queue.getCompleted(0, limit - 1);
          break;
        case 'failed':
          jobs = await queue.getFailed(0, limit - 1);
          break;
        default:
          return res.status(400).json({ error: 'Invalid status' });
      }
      
      const jobsData = jobs.map(job => ({
        id: job.id,
        name: job.name,
        data: job.data,
        opts: job.opts,
        progress: job.progress,
        timestamp: job.timestamp,
        processedOn: job.processedOn,
        finishedOn: job.finishedOn,
        failedReason: job.failedReason,
        returnvalue: job.returnvalue,
      }));
      
      res.json({ jobs: jobsData });
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to get jobs' });
    }
  });

  /* Retry a failed job */
  router.post("/queues/:queueName/jobs/:jobId/retry", async (req: any, res) => {
    const { queueName, jobId } = req.params;
    
    const queue = queues[queueName];
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    
    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      await job.retry();
      res.json({ ok: true });
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to retry job' });
    }
  });

  /* Remove a job */
  router.delete("/queues/:queueName/jobs/:jobId", async (req: any, res) => {
    const { queueName, jobId } = req.params;
    
    const queue = queues[queueName];
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    
    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job not found' });
      }
      
      await job.remove();
      res.json({ ok: true });
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to remove job' });
    }
  });

  /* Clean completed/failed jobs */
  router.post("/queues/:queueName/clean", async (req: any, res) => {
    const { queueName } = req.params;
    const { status = 'completed', grace = 3600000 } = req.body; // 1 hour grace period
    
    const queue = queues[queueName];
    if (!queue) {
      return res.status(404).json({ error: 'Queue not found' });
    }
    
    try {
      const result = await queue.clean(grace, 100, status);
      res.json({ ok: true, cleaned: result });
    } catch (error: unknown) {
      res.status(500).json({ error: 'Failed to clean queue' });
    }
  });

} else {
  // Return disabled status when Redis is not available
  router.get("/queues", async (req: any, res) => {
    res.json({ 
      queuesEnabled: false, 
      message: "Queue management disabled. Set QUEUES_ENABLED=true and REDIS_URL to enable.",
      queues: [] 
    });
  });
}

/* System health check */
router.get("/health", async (req: any, res) => {
  const health = {
    timestamp: new Date().toISOString(),
    services: {
      database: true, // We know DB is working since we got here
      redis: queuesEnabled,
      queues: queuesEnabled,
    },
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  };
  
  res.json(health);
});

export default router;