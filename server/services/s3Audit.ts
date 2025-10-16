import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export async function listAndSummarizeBucket(prefix: string = "") {
  const s3 = new S3Client({ region: process.env.S3_REGION });
  const Bucket = process.env.S3_BUCKET!;
  let ContinuationToken: string | undefined = undefined;
  let total = 0, bytes = 0;
  const sample: string[] = [];
  
  do {
    const rsp = await s3.send(new ListObjectsV2Command({ Bucket, Prefix: prefix, ContinuationToken }));
    (rsp.Contents || []).forEach(o => {
      total++;
      bytes += (o.Size || 0);
      if (sample.length < 10 && o.Key) sample.push(o.Key);
    });
    ContinuationToken = rsp.IsTruncated ? rsp.NextContinuationToken : undefined;
  } while (ContinuationToken);
  
  return { total, bytes, sample, mismatches: [] as any[] };
}