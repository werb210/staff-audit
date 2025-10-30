import { users, businesses, applications, documents, } from "../shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";
export class DatabaseStorage {
    // User operations (mandatory for Replit Auth)
    async getUser(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user;
    }
    async getUserByEmail(email) {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user;
    }
    async upsertUser(userData) {
        const [user] = await db
            .insert(users)
            .values(userData)
            .onConflictDoUpdate({
            target: users.id,
            set: {
                ...userData,
                updatedAt: new Date(),
            },
        })
            .returning();
        return user;
    }
    // Tenant operations
    async getTenant(id) {
        const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
        return tenant;
    }
    async createTenant(tenantData) {
        const [tenant] = await db.insert(tenants).values(tenantData).returning();
        return tenant;
    }
    // Business operations
    async getBusinessByUserId(userId, tenantId) {
        const [business] = await db
            .select()
            .from(businesses)
            .where(and(eq(businesses.userId, userId), eq(businesses.tenantId, tenantId)));
        return business;
    }
    async createBusiness(businessData) {
        const [business] = await db.insert(businesses).values(businessData).returning();
        return business;
    }
    async updateBusiness(id, businessData) {
        const [business] = await db
            .update(businesses)
            .set({ ...businessData, updatedAt: new Date() })
            .where(eq(businesses.id, id))
            .returning();
        return business;
    }
    // Application operations with tenant isolation
    async getApplicationsByTenant(tenantId) {
        return await db
            .select()
            .from(applications)
            .where(eq(applications.tenantId, tenantId));
    }
    async getApplicationsByUser(userId, tenantId) {
        return await db
            .select()
            .from(applications)
            .where(and(eq(applications.userId, userId), eq(applications.tenantId, tenantId)));
    }
    async getApplication(id, tenantId) {
        const [application] = await db
            .select()
            .from(applications)
            .where(and(eq(applications.id, id), eq(applications.tenantId, tenantId)));
        return application;
    }
    async createApplication(applicationData) {
        const [application] = await db.insert(applications).values(applicationData).returning();
        return application;
    }
    async updateApplication(id, applicationData) {
        const [application] = await db
            .update(applications)
            .set({ ...applicationData, updatedAt: new Date() })
            .where(eq(applications.id, id))
            .returning();
        return application;
    }
    // Document operations
    async getDocumentsByApplication(applicationId) {
        return await db
            .select()
            .from(documents)
            .where(eq(documents.applicationId, applicationId));
    }
    async createDocument(documentData) {
        const [document] = await db.insert(documents).values(documentData).returning();
        return document;
    }
    // Business operations
    async getBusiness(id) {
        const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
        return business;
    }
    // Audit operations
    async createAuditLog(logData) {
        const [log] = await db.insert(auditLog).values(logData).returning();
        return log;
    }
}
export const storage = new DatabaseStorage();
