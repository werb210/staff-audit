#!/usr/bin/env node

async function loadSdk() {
  try {
    return await import("@aws-sdk/client-s3");
  } catch (error) {
    const message = error?.message ?? String(error);
    console.warn("⚠️ S3 health check skipped: unable to load @aws-sdk/client-s3 (" + message + ")");
    console.warn("   Install the AWS SDK to enable connectivity verification.");
    process.exit(0);
  }
}

async function main() {
  const { S3Client, ListBucketsCommand } = await loadSdk();

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "ca-central-1";
  const hasExplicitCredentials = Boolean(
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) || process.env.AWS_PROFILE
  );

  if (!hasExplicitCredentials) {
    console.warn("⚠️ S3 health check skipped: AWS credentials not configured.");
    console.warn("   Set AWS_ACCESS_KEY_ID/AWS_SECRET_ACCESS_KEY or AWS_PROFILE to run the connectivity test.");
    process.exit(0);
  }

  const client = new S3Client({ region });

  try {
    const response = await client.send(new ListBucketsCommand({}));
    const bucketList = response.Buckets?.map((bucket) => bucket.Name).join(", ") || "none";
    console.log("✅ S3 Health Check Passed");
    console.log("Buckets:", bucketList);
  } catch (error) {
    const message = error?.message ?? String(error);
    console.error("❌ S3 Health Check Failed:", message);
    process.exit(1);
  }
}

await main();
