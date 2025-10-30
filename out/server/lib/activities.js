import { db } from "../db/drizzle.js";
export async function logActivity(input) {
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
