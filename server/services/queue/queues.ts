import IORedis from "ioredis";
import { Queue } from "bullmq";

let conn: IORedis | null = null;
export function isQueuesOn(){
  return String(process.env.QUEUES_ENABLED||"true").toLowerCase()==="true" && !!process.env.REDIS_URL;
}
export function getConnection(){
  if (!isQueuesOn()) return null;
  if (!conn) conn = new IORedis(process.env.REDIS_URL as string, { maxRetriesPerRequest: 2, enableReadyCheck: true });
  return conn;
}

const registry: Record<string, Queue> = {};
export function getKnownQueues(): string[] {
  const env = String(process.env.QUEUE_NAMES||"").split(",").map(s=>s.trim()).filter(Boolean);
  return env.length ? env : ["ocr","sms","emails","webhooks","reports","engine"];
}
export function getQueue(name:string): Queue {
  if (registry[name]) return registry[name];
  const connection = getConnection();
  // A null connection means queues are disabled; throw only when trying to use it
  if (!connection) throw new Error("queues_disabled");
  registry[name] = new Queue(name, { connection, prefix: "{staff}" }); // prefix helps isolation
  return registry[name];
}

export async function getCounts(name:string){
  const q = getQueue(name);
  try {
    return await q.getJobCounts("waiting","active","delayed","completed","failed","paused");
  } catch {
    return null;
  }
}

export type JobLite = {
  id: string;
  name?: string;
  state: string;
  timestamp?: number;
  attemptsMade?: number;
  progress?: any;
  failedReason?: string;
};

export async function listJobs(name:string, state:string, offset=0, limit=50): Promise<JobLite[]>{
  const q = getQueue(name);
  const start = Math.max(0, offset);
  const end = start + Math.max(1, Math.min(200, limit)) - 1;
  const jobs = await q.getJobs([state as any], start, end, false);
  return jobs.map(j=>({
    id: String(j.id),
    name: j.name,
    state,
    timestamp: j.timestamp || j.processedOn || j.finishedOn || undefined,
    attemptsMade: j.attemptsMade,
    progress: j.progress,
    failedReason: j.failedReason ? String(j.failedReason).slice(0,240) : undefined,
  }));
}

export async function retryJob(name:string, jobId:string){
  const q = getQueue(name);
  const j = await q.getJob(jobId);
  if (!j) throw new Error("job_not_found");
  await j.retry();
  return { ok:true };
}

export async function removeJob(name:string, jobId:string){
  const q = getQueue(name);
  const j = await q.getJob(jobId);
  if (!j) throw new Error("job_not_found");
  await j.remove();
  return { ok:true };
}

export async function promoteJob(name:string, jobId:string){
  const q = getQueue(name);
  const j = await q.getJob(jobId);
  if (!j) throw new Error("job_not_found");
  await j.promote();
  return { ok:true };
}

export async function retryAllFailed(name:string, limit=500){
  const q = getQueue(name);
  const failed = await q.getJobs(["failed"], 0, Math.max(1, Math.min(5000, limit))-1, false);
  let ok=0, miss=0;
  for (const j of failed){
    try { await j.retry(); ok++; } catch { miss++; }
  }
  return { ok, miss };
}

export async function drainQueue(name:string, delayed=false){
  const q = getQueue(name);
  await q.drain(delayed);
  return { ok:true };
}