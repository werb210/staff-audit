import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({});

export async function directUpload(uploadParams: any) {
  await s3.send(
    new PutObjectCommand({
      ...uploadParams,
      ServerSideEncryption: "AES256" as const,
    })
  );
}
