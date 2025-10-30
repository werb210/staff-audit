export const S3_CONFIG = {
  region: process.env.AWS_REGION!,
  bucket: process.env.S3_BUCKET!,
  serverSideEncryption: "AES256" as const,
};