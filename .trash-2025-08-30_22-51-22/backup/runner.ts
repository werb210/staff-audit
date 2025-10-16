import { db } from "../../db";
import { sql } from "drizzle-orm";
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { spawn } from "child_process";
import { PassThrough, pipeline } from "stream";
import { createGzip } from "zlib";

const s3 = new S3Client({ region: process.env.AWS_REGION });

function isoStamp(){ return new Date().toISOString().replace(/[:.]/g,"-"); }
function prefix(){ return (process.env.BACKUP_S3_PREFIX || "backups/pg").replace(/^\/*/,""); }

export async function runBackup(){
  if (String(process.env.BACKUP_ENABLED||"true").toLowerCase()!=="true") throw new Error("backups disabled");
  const log = await db.execute(sql`INSERT INTO backups_log(kind, status) VALUES ('pg_dump','pending') RETURNING id`);
  const id = log.rows?.[0]?.id;

  try{
    const bucket = process.env.S3_BUCKET!;
    const key = `${prefix()}/${isoStamp()}.sql.gz`;
    const gzip = createGzip();
    const pass = new PassThrough();
    const put = s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: pass, ContentType: "application/gzip" }));

    // try pg_dump; if spawn fails soon, fallback to JSON
    const pgDumpBin = process.env.BACKUP_PG_DUMP || "pg_dump";
    const cp = spawn(pgDumpBin, ["--no-owner", "--no-privileges", process.env.DATABASE_URL as string], { env: process.env, stdio: ["ignore","pipe","pipe"] });
    let spawnFailed = false; let stderrBuf = "";
    cp.on("error", ()=>{ spawnFailed = true; });
    cp.stderr.on("data", d=> stderrBuf += d.toString());

    const onComplete = async (ok:boolean, err?:any, bytes?:number)=>{
      await db.execute(sql`
        UPDATE backups_log SET status=${ok?"ok":"error"}, error=${ok?null:(String(err||""))}, s3_key=${key}, bytes=${bytes||null}, finished_at=now()
        WHERE id=${id}
      `);
    };

    if (!spawnFailed){
      // stream pg_dump -> gzip -> s3
      let uploadedBytes = 0;
      gzip.on("data", (c)=> uploadedBytes += c.length);
      pipeline(cp.stdout, gzip, pass, (err)=>{ if (err) console.error("pipeline error", err); });
      await put;
      const code = await new Promise<number>(res=> cp.on("close", res));
      if (code !== 0) throw new Error(`pg_dump exit ${code}: ${stderrBuf.slice(0,500)}`);
      await onComplete(true);
      return { kind:"pg_dump", key };
    }

    // Fallback: JSON NDJSON of all user tables
    const log2 = await db.execute(sql`UPDATE backups_log SET kind='jsondump' WHERE id=${id}`);
    const key2 = `${prefix()}/${isoStamp()}.ndjson.gz`;
    const pass2 = new PassThrough();
    const put2 = s3.send(new PutObjectCommand({ Bucket: bucket, Key: key2, Body: pass2, ContentType: "application/gzip" }));
    const gz2 = createGzip();
    pipeline(gz2, pass2, (err)=>{ if (err) console.error("gz pipeline err", err); });

    // Write header
    gz2.write(JSON.stringify({ type:"header", at:new Date().toISOString() })+"\n");

    const tables = (await db.execute(sql`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema')
      ORDER BY table_schema, table_name
    `)).rows || [];

    for (const t of tables){
      const tn = `"${t.table_schema}"."${t.table_name}"`;
      const rows = (await db.execute(sql.raw(`SELECT row_to_json(t) AS j FROM ${tn} t`))).rows || [];
      gz2.write(JSON.stringify({ type:"table", schema:t.table_schema, name:t.table_name, count: rows.length })+"\n");
      for (const r of rows) gz2.write(JSON.stringify({ type:"row", table: t.table_name, data: r.j })+"\n");
    }
    gz2.end();
    await put2;
    await db.execute(sql`UPDATE backups_log SET s3_key=${key2}, status='ok', finished_at=now() WHERE id=${id}`);
    return { kind:"jsondump", key: key2 };
  }catch(e:any){
    await db.execute(sql`UPDATE backups_log SET status='error', error=${String(e?.message||e)}, finished_at=now() WHERE id=${id}`);
    throw e;
  }
}

export async function cleanupOld(){
  const bucket = process.env.S3_BUCKET!;
  const days = Number(process.env.BACKUP_RETENTION_DAYS || 14);
  const cutoff = Date.now() - days*24*3600*1000;

  let token: string | undefined = undefined;
  let removed = 0;
  do {
    const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix()+"/", ContinuationToken: token }));
    for (const o of (list.Contents||[])){
      const t = o.LastModified?.getTime?.() || 0;
      if (t < cutoff) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: o.Key! }));
        removed++;
      }
    }
    token = list.NextContinuationToken;
  } while (token);

  return { removed };
}

export async function restoreFromS3(key:string){
  if (String(process.env.ALLOW_DB_RESTORE||"false").toLowerCase()!=="true") throw new Error("restore disabled");
  const bucket = process.env.S3_BUCKET!;
  const ext = (key||"").split(".").pop()?.toLowerCase();
  if (!/\.sql\.gz$/.test(key)) throw new Error("only .sql.gz restore supported");
  const obj = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const gunzip = (await import("zlib")).createGunzip();
  const psql = process.env.BACKUP_PSQL || "psql";
  return new Promise<void>((resolve, reject)=>{
    const cp = spawn(psql, [process.env.DATABASE_URL as string], { env: process.env, stdio: ["pipe","inherit","inherit"] });
    (obj.Body as any).pipe(gunzip).pipe(cp.stdin);
    cp.on("close", (code)=> code===0 ? resolve() : reject(new Error("psql exit "+code)));
  });
}