import { db } from "../db/drizzle.js";

export async function logActivity(input: {
  tenant?: string; 
  type: string; 
  contactId?: string; 
  applicationId?: string;
  actorId?: string; 
  tags?: string[]; 
  meta?: any;
}) {
  return db.activity.create({
    data: {
      tenant: input.tenant ?? "bf",
      type: input.type,
      contactId: input.contactId ?? null,
      applicationId: input.applicationId ?? null,
      actorId: input.actorId ?? null,
      tags: input.tags ?? [],
      meta: input.meta ?? {},
    },
  });
}