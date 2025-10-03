import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const bucket = process.env.S3_BUCKET;
if (!bucket) throw new Error("❌ S3_BUCKET env variable missing");

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ca-central-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function uploadToS3(applicationId: string, file: Express.Multer.File) {
  const storageKey = `${applicationId}/${file.originalname}`;
  const checksum = crypto.createHash("sha256").update(file.buffer).digest("hex");

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    Body: file.buffer,
    ContentType: file.mimetype,
    ServerSideEncryption: "AES256",
  });

  try {
    await s3.send(command);
    console.log(`✅ Uploaded to S3: ${storageKey}`);
    return { key: storageKey, storageKey, checksum };
  } catch (err) {
    console.error("❌ S3 Upload Failed", err);
    throw err;
  }
}

export async function uploadDocumentToS3(
  applicationId: string,
  buffer: Buffer,
  options: {
    documentType: string;
    fileName: string;
  }
) {
  const storageKey = `${applicationId}/${Date.now()}-${options.fileName}`;
  const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: storageKey,
    Body: buffer,
    ContentType: "application/pdf",
    ServerSideEncryption: "AES256",
  });

  try {
    await s3.send(command);
    console.log(`✅ Uploaded document to S3: ${storageKey}`);
    return storageKey;
  } catch (err) {
    console.error("❌ S3 Document Upload Failed", err);
    throw err;
  }
}