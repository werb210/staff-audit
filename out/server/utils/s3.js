import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { S3_CONFIG } from "../config";
const s3 = new S3Client({ region: S3_CONFIG.region });
export async function uploadToS3(bucket, key, body) {
    await s3.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ServerSideEncryption: S3_CONFIG.serverSideEncryption,
    }));
}
