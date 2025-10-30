import { Router } from "express";
import { db } from "../db/drizzle";
import { sql } from "drizzle-orm";
import IORedis from "ioredis";
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import fetch from "node-fetch";
import { getToken } from "../services/graph";
const r = Router();
r.get("/ops/status", async (_req, res) => {
    const out = { ok: true, checks: {} };
    // ENV snapshots (presence only)
    const need = {
        TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
        TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
        TWILIO_MESSAGING_SERVICE_SID: !!process.env.TWILIO_MESSAGING_SERVICE_SID,
        S3_BUCKET: !!process.env.S3_BUCKET,
        S3_REGION: !!process.env.S3_REGION,
        DATABASE_URL: !!process.env.DATABASE_URL,
        REDIS_URL: !!process.env.REDIS_URL,
        O365_SERVICE_USER_ID: !!process.env.O365_SERVICE_USER_ID,
        PUBLIC_BASE_URL: !!process.env.PUBLIC_BASE_URL,
        LINKEDIN_CLIENT_ID: !!process.env.LINKEDIN_CLIENT_ID,
        LINKEDIN_CLIENT_SECRET: !!process.env.LINKEDIN_CLIENT_SECRET
    };
    out.checks.env = need;
    try {
        await db.execute(sql `select 1`);
        out.checks.database = { ok: true };
    }
    catch (e) {
        out.checks.database = { ok: false, err: e?.message };
        out.ok = false;
    }
    try {
        const r = new IORedis(process.env.REDIS_URL);
        await r.ping();
        await r.quit();
        out.checks.redis = { ok: true };
    }
    catch (e) {
        out.checks.redis = { ok: false, err: e?.message };
        out.ok = false;
    }
    try {
        const s3 = new S3Client({ region: process.env.S3_REGION });
        await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET }));
        out.checks.s3 = { ok: true };
    }
    catch (e) {
        out.checks.s3 = { ok: false, err: e?.message };
        out.ok = false;
    }
    try {
        // Twilio: lightweight auth check
        const sid = process.env.TWILIO_ACCOUNT_SID, tok = process.env.TWILIO_AUTH_TOKEN;
        if (sid && tok) {
            const tw = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
                headers: { "Authorization": "Basic " + Buffer.from(`${sid}:${tok}`).toString("base64") }
            });
            out.checks.twilio = { ok: tw.ok };
            if (!tw.ok)
                out.ok = false;
        }
        else
            out.checks.twilio = { ok: false, err: "env" };
    }
    catch (e) {
        out.checks.twilio = { ok: false, err: e?.message };
        out.ok = false;
    }
    try {
        if (process.env.O365_SERVICE_USER_ID) {
            await getToken(process.env.O365_SERVICE_USER_ID);
            out.checks.graph = { ok: true };
        }
        else
            out.checks.graph = { ok: false, err: "env" };
    }
    catch (e) {
        out.checks.graph = { ok: false, err: e?.message };
        out.ok = false;
    }
    res.json(out);
});
export default r;
