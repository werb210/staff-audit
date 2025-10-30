import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const REGION = process.env.AWS_REGION;
const PUB = process.env.S3_BUCKET_PUBLIC || process.env.AWS_S3_BUCKET_NAME;
const PRI = process.env.S3_BUCKET_PRIVATE || process.env.AWS_S3_BUCKET_NAME;
const ENDPOINT = process.env.S3_ENDPOINT; // optional
export const s3 = new S3Client({ region: REGION, ...(ENDPOINT ? { endpoint: ENDPOINT, forcePathStyle: true } : {}) });
export async function signPut(scope, key, type) {
    const Bucket = scope === "public" ? PUB : PRI;
    const cmd = new PutObjectCommand({ Bucket, Key: key, ContentType: type, ACL: scope === "public" ? "public-read" : undefined });
    return getSignedUrl(s3, cmd, { expiresIn: 900 });
}
export async function signGet(scope, key) {
    const Bucket = scope === "public" ? PUB : PRI;
    const cmd = new GetObjectCommand({ Bucket, Key: key });
    return getSignedUrl(s3, cmd, { expiresIn: 900 });
}
export async function list(scope, prefix, max = 1000) {
    const Bucket = scope === "public" ? PUB : PRI;
    const cmd = new ListObjectsV2Command({ Bucket, Prefix: prefix, MaxKeys: max });
    const out = await s3.send(cmd);
    return (out.Contents || []).map(o => ({ key: o.Key, size: o.Size, updatedAt: o.LastModified }));
}
