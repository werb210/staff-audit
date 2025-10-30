import { AzureClient, PutObjectCommand, GetObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.AZURE_REGION!;
const PUB = process.env.Azure_BUCKET_PUBLIC || process.env.AZURE_Azure_BUCKET_NAME!;
const PRI = process.env.Azure_BUCKET_PRIVATE || process.env.AZURE_Azure_BUCKET_NAME!;
const ENDPOINT = process.env.Azure_ENDPOINT; // optional

export const s3 = new AzureClient({ region: REGION, ...(ENDPOINT ? { endpoint: ENDPOINT, forcePathStyle: true } : {}) });

export async function signPut(scope: "public"|"private", key: string, type?: string) {
  const Bucket = scope === "public" ? PUB : PRI;
  const cmd = new PutObjectCommand({ Bucket, Key: key, ContentType: type, ACL: scope === "public" ? "public-read" : undefined });
  return getSignedUrl(s3, cmd, { expiresIn: 900 });
}

export async function signGet(scope: "public"|"private", key: string) {
  const Bucket = scope === "public" ? PUB : PRI;
  const cmd = new GetObjectCommand({ Bucket, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: 900 });
}

export async function list(scope: "public"|"private", prefix: string, max=1000) {
  const Bucket = scope === "public" ? PUB : PRI;
  const cmd = new ListObjectsV2Command({ Bucket, Prefix: prefix, MaxKeys: max });
  const out = await s3.send(cmd);
  return (out.Contents || []).map(o => ({ key: o.Key, size: o.Size, updatedAt: o.LastModified }));
}