import cron from "node-cron";

export type JobFn = () => Promise<void> | void;

interface JobEntry {
  name: string;
  schedule: string;
  fn: JobFn;
}

const jobs: JobEntry[] = [];

export function registerJob(name: string, schedule: string, fn: JobFn) {
  jobs.push({ name, schedule, fn });
  cron.schedule(schedule, async () => {
    console.log(`⏰ Running job: ${name}`);
    try {
      await fn();
      console.log(`✅ Job complete: ${name}`);
    } catch (err) {
      console.error(`❌ Job failed: ${name}`, err);
    }
  });
}

export function listJobs() {
  return jobs.map(j => ({ name: j.name, schedule: j.schedule }));
}
