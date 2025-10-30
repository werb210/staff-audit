import { db } from "../db/drizzle";
import { documents } from "../db/schema";
export async function pureS3Upload(id, fileName, fileSize) {
    await db.insert(documents).values({
        id,
        name: fileName,
        size: fileSize,
    });
}
