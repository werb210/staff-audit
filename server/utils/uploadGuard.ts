import { eq } from "drizzle-orm";
import { db } from "../db/drizzle";
import { applications } from "../db/schema";

export async function uploadGuard(appId: string) {
  const [app] = await db.select().from(applications).where(eq(applications.id, appId));
  if (!app) throw new Error("Application not found");

  const status = (app as any).status ?? "";
  const allowedStatuses = ["new", "in_review", "requires_docs"];
  if (!allowedStatuses.includes(status)) throw new Error(`Uploads not allowed for status: ${status}`);

  const createdAt = (app as any).createdAt ? new Date((app as any).createdAt) : new Date();
  const daysSinceCreated = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
  return { ok: true, daysSinceCreated };
}
