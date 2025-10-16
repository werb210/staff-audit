import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Hard-fail if creds are missing (server)
if (!process.env.S3_BUCKET || !process.env.AWS_REGION) {
  throw new Error("S3 configuration missing: set S3_BUCKET and AWS_REGION");
}

if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
  throw new Error("AWS credentials missing: set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY");
}

const REGION = process.env.AWS_REGION!;
const BUCKET = process.env.S3_BUCKET!;

console.log(`🔧 S3 Config: region=${REGION}, bucket=${BUCKET}`);

const s3 = new S3Client({ 
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function presignUpload(objectKey: string, contentType: string, sha256: string, ttlSeconds = 900) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: objectKey,
    ContentType: contentType,
    Metadata: { sha256 }
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: ttlSeconds });
  return { url, key: objectKey };
}

// Legacy compatibility
export async function presignPut(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
}

export async function presignGet(key: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });
  return await getSignedUrl(s3, command, { expiresIn: 3600 });
}