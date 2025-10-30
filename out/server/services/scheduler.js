import cron from "node-cron";
const jobs = [];
export function registerJob(name, schedule, fn) {
    jobs.push({ name, schedule, fn });
    cron.schedule(schedule, async () => {
        console.log(`⏰ Running job: ${name}`);
        try {
            await fn();
            console.log(`✅ Job complete: ${name}`);
        }
        catch (err) {
            console.error(`❌ Job failed: ${name}`, err);
        }
    });
}
export function listJobs() {
    return jobs.map(j => ({ name: j.name, schedule: j.schedule }));
}
