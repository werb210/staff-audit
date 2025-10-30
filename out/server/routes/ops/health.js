import { Router } from "express";
import { db } from "../../db";
import { sql } from "drizzle-orm";
import { connection } from "../../infra/queue";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
const router = Router();
router.get("/healthz", (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));
router.get("/readyz", async (_req, res) => {
    try {
        await db.execute(sql `SELECT 1`);
        await connection.ping();
        if (process.env.S3_BUCKET) {
            const s3 = new S3Client({ region: process.env.AWS_REGION });
            await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }));
        }
        res.json({ ok: true });
    }
    catch (e) {
        res.status(503).json({ ok: false, error: e?.message || "not ready" });
    }
});
export default router;
