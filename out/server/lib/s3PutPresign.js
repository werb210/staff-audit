import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET;
export async function presignUpload(key, contentType = "application/octet-stream") {
    const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType, ServerSideEncryption: "AES256" });
    const url = await getSignedUrl(s3, cmd, { expiresIn: 600 });
    return { url, key, bucket: BUCKET };
}
