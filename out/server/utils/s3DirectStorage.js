import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({});
export async function directUpload(uploadParams) {
    await s3.send(new PutObjectCommand({
        ...uploadParams,
        ServerSideEncryption: "AES256",
    }));
}
