import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const REGION = process.env.S3_REGION!;
const BUCKET = process.env.S3_BUCKET!;

export const s3 = new S3Client({ region: REGION });

export async function presignUpload(key: string, contentType="application/octet-stream", expires=900){
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(s3, cmd, { expiresIn: expires });
}

export async function presignDownload(key: string, expires=900){
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn: expires });
}

export async function head(key:string){
  try{
    const h = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key:key }));
    return { ok:true, meta:h };
  }catch(e:any){ return { ok:false, error:String(e)}}
}

export async function getObjectStream(key: string) {
  try {
    const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    const response = await s3.send(cmd);
    return { ok: true, stream: response.Body };
  } catch (e: any) {
    return { ok: false, error: String(e) };
  }
}