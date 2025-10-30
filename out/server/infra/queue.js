import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    lazyConnect: true,
    retryDelayOnFailover: 100,
    connectTimeout: 5000,
});
connection.on('error', (err) => {
    // Suppress connection error spam when Redis unavailable
    if (!err.message.includes('ECONNREFUSED')) {
        console.warn('🔄 [REDIS] Connection error:', err.message);
    }
});
export const qNames = {
    ocr: (process.env.QUEUE_PREFIX || "bf") + "-ocr",
    sla: (process.env.QUEUE_PREFIX || "bf") + "-sla",
    automationsScan: (process.env.QUEUE_PREFIX || "bf") + "-auto-scan",
    automationsSend: (process.env.QUEUE_PREFIX || "bf") + "-auto-send",
    analytics: (process.env.QUEUE_PREFIX || "bf") + "-analytics",
};
export function makeQueue(name) {
    const q = new Queue(name, {
        connection,
        defaultJobOptions: {
            attempts: 5,
            backoff: { type: "exponential", delay: 3000 },
            removeOnComplete: 1000,
            removeOnFail: 5000
        }
    });
    new QueueEvents(name, { connection }); // side-effects (metrics can subscribe)
    return q;
}
export function makeWorker(name, processor) {
    const w = new Worker(name, processor, { connection, concurrency: 5 });
    w.on("failed", (job, err) => console.error(`[Q:${name}] failed`, job?.id, err?.message));
    w.on("completed", (job) => console.log(`[Q:${name}] done`, job?.id));
    return w;
}
export const queues = {
    ocr: makeQueue(qNames.ocr),
    sla: makeQueue(qNames.sla),
    automationsScan: makeQueue(qNames.automationsScan),
    automationsSend: makeQueue(qNames.automationsSend),
    analytics: makeQueue(qNames.analytics),
};
export async function enqueue(q, name, data, opts = {}) {
    const job = await q.add(name, { ...data, _cid: opts.correlationId || cryptoRandom() }, opts);
    return job.id;
}
function cryptoRandom() {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
export { connection };
