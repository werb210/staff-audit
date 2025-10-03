import {
  users,

  businesses,
  applications,
  documents,

  type User,
  type InsertUser,

  type Business,
  type InsertBusiness,
  type Application,
  type InsertApplication,
  type Document,
  type InsertDocument,

} from "../shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // User operations (mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: InsertUser): Promise<User>;
  
  // Tenant operations (removed - no longer needed)
  
  // Business operations
  getBusinessByUserId(userId: string, tenantId: string): Promise<Business | undefined>;
  getBusiness(id: string): Promise<Business | undefined>;
  createBusiness(business: InsertBusiness): Promise<Business>;
  updateBusiness(id: string, business: Partial<InsertBusiness>): Promise<Business | undefined>;
  
  // Application operations
  getApplicationsByTenant(tenantId: string): Promise<Application[]>;
  getApplicationsByUser(userId: string, tenantId: string): Promise<Application[]>;
  getApplication(id: string, tenantId: string): Promise<Application | undefined>;
  createApplication(application: InsertApplication): Promise<Application>;
  updateApplication(id: string, application: Partial<InsertApplication>): Promise<Application | undefined>;
  
  // Document operations
  getDocumentsByApplication(applicationId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  
  // Audit operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
}

export class DatabaseStorage implements IStorage {
  // User operations (mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
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
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async createTenant(tenantData: InsertTenant): Promise<Tenant> {
    const [tenant] = await db.insert(tenants).values(tenantData).returning();
    return tenant;
  }

  // Business operations
  async getBusinessByUserId(userId: string, tenantId: string): Promise<Business | undefined> {
    const [business] = await db
      .select()
      .from(businesses)
      .where(and(eq(businesses.userId, userId), eq(businesses.tenantId, tenantId)));
    return business;
  }

  async createBusiness(businessData: InsertBusiness): Promise<Business> {
    const [business] = await db.insert(businesses).values(businessData).returning();
    return business;
  }

  async updateBusiness(id: string, businessData: Partial<InsertBusiness>): Promise<Business | undefined> {
    const [business] = await db
      .update(businesses)
      .set({ ...businessData, updatedAt: new Date() })
      .where(eq(businesses.id, id))
      .returning();
    return business;
  }

  // Application operations with tenant isolation
  async getApplicationsByTenant(tenantId: string): Promise<Application[]> {
    return await db
      .select()
      .from(applications)
      .where(eq(applications.tenantId, tenantId));
  }

  async getApplicationsByUser(userId: string, tenantId: string): Promise<Application[]> {
    return await db
      .select()
      .from(applications)
      .where(and(eq(applications.userId, userId), eq(applications.tenantId, tenantId)));
  }

  async getApplication(id: string, tenantId: string): Promise<Application | undefined> {
    const [application] = await db
      .select()
      .from(applications)
      .where(and(eq(applications.id, id), eq(applications.tenantId, tenantId)));
    return application;
  }

  async createApplication(applicationData: InsertApplication): Promise<Application> {
    const [application] = await db.insert(applications).values(applicationData).returning();
    return application;
  }

  async updateApplication(id: string, applicationData: Partial<InsertApplication>): Promise<Application | undefined> {
    const [application] = await db
      .update(applications)
      .set({ ...applicationData, updatedAt: new Date() })
      .where(eq(applications.id, id))
      .returning();
    return application;
  }

  // Document operations
  async getDocumentsByApplication(applicationId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, applicationId));
  }

  async createDocument(documentData: InsertDocument): Promise<Document> {
    const [document] = await db.insert(documents).values(documentData).returning();
    return document;
  }

  // Business operations
  async getBusiness(id: string): Promise<Business | undefined> {
    const [business] = await db.select().from(businesses).where(eq(businesses.id, id));
    return business;
  }

  // Audit operations
  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db.insert(auditLog).values(logData).returning();
    return log;
  }
}

export const storage = new DatabaseStorage();
