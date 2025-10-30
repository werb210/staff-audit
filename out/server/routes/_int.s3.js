import { Router } from "express";
import { S3Client, HeadBucketCommand, GetBucketLocationCommand, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";
const r = Router();
function env(name, def) {
    const v = process.env[name] ?? def;
    if (!v)
        throw new Error(`[s3:env] Missing ${name}`);
    return v;
}
function client() {
    return new S3Client({
        region: env("AWS_REGION", "ca-central-1"),
        // Rely on standard env creds; do NOT echo them back.
    });
}
/**
 * GET /api/_int/s3/diag
 * - Confirms bucket exists + region
 * - Returns sanitized config (no secrets)
 */
r.get("/diag", async (_req, res) => {
    const bucketPriv = process.env.S3_BUCKET_PRIVATE || process.env.AWS_S3_BUCKET_NAME || "";
    const bucketPub = process.env.S3_BUCKET_PUBLIC || process.env.AWS_S3_BUCKET_NAME || "";
    const region = process.env.AWS_REGION || "ca-central-1";
    try {
        const s3 = client();
        const head = await s3.send(new HeadBucketCommand({ Bucket: bucketPriv }));
        const loc = await s3.send(new GetBucketLocationCommand({ Bucket: bucketPriv }));
        res.json({
            ok: true,
            regionConfigured: region,
            bucketPrivate: bucketPriv,
            bucketPublic: bucketPub,
            headBucket: head.$metadata?.httpStatusCode,
            bucketLocation: loc?.LocationConstraint ?? "(null=us-east-1 semantics)",
            sseExpected: "SSE-S3 or SSE-KMS (check your bucket default rule)",
            publicAccessBlock: "Verify in AWS console (not exposed via this endpoint)",
            note: "No secrets are returned here."
        });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e?.message || "diag_error", bucket: bucketPriv });
    }
});
/**
 * POST /api/_int/s3/roundtrip
 * Body: { contentType?: string, scope?: "private"|"public" }
 * - Writes a tiny test object under int-tests/
 * - HEADs it
 * - Returns presigned GET URL
 * - DOES NOT DELETE (respecting 'no deletion' policy)
 */
r.post("/roundtrip", async (req, res) => {
    try {
        const scope = (req.body?.scope ?? "private") === "public" ? "public" : "private";
        const bucket = scope === "public"
            ? (process.env.S3_BUCKET_PUBLIC || process.env.AWS_S3_BUCKET_NAME)
            : (process.env.S3_BUCKET_PRIVATE || process.env.AWS_S3_BUCKET_NAME);
        const s3 = client();
        const key = `int-tests/${Date.now()}-${crypto.randomUUID()}.txt`;
        const contentType = req.body?.contentType || "text/plain";
        const body = `boreal-oib s3 roundtrip test @ ${new Date().toISOString()}`;
        // PUT (server-side) with SSE-S3 to ensure encryption is honored
        await s3.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
            ServerSideEncryption: "AES256"
        }));
        // HEAD
        const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        // Presign GET
        const getUrl = await getSignedUrl(s3, new (require("@aws-sdk/client-s3").GetObjectCommand)({ Bucket: bucket, Key: key }), { expiresIn: 60 * 10 });
        res.json({
            ok: true,
            bucket,
            key,
            head: {
                status: head.$metadata?.httpStatusCode,
                contentType: head.ContentType,
                sse: head.ServerSideEncryption || "unknown",
                size: head.ContentLength
            },
            presignedGet: getUrl,
            note: "Object left in place under int-tests/ (no deletions, per policy)"
        });
    }
    catch (e) {
        res.status(500).json({ ok: false, error: e?.message || "roundtrip_error" });
    }
});
export default r;
