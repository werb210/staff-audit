import { db } from "../db/drizzle";
import { documents } from "../db/schema";

export async function pureS3Upload(id: string, fileName: string, fileSize: number) {
  await db.insert(documents).values({
    id,
    name: fileName,
    size: fileSize,
  });
}
