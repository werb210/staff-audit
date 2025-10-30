import { eq } from "drizzle-orm";
import { db } from "../db/drizzle";
import { applications, businesses, documents } from "../db/schema";

export async function generatePdfData() {
  return db
    .select({
      fallbackBusinessName: applications.businessName,
      requestedAmount: applications.requestedAmount,
      useOfFunds: applications.useOfFunds,
      createdAt: applications.createdAt,
    })
    .from(applications)
    .leftJoin(businesses, eq(applications.businessId, businesses.id))
    .leftJoin(documents, eq(applications.id, documents.applicationId))
    .execute();
}
