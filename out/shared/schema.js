import { pgTable, varchar, text, integer, timestamp, boolean, uuid, numeric, jsonb, } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
// ==================================================
// USERS
// ==================================================
export const users = pgTable("users", {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }),
    role: varchar("role", { length: 50 }).default("Staff"),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    phone: varchar("phone", { length: 50 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertUserSchema = createInsertSchema(users).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// ==================================================
// COMPANIES
// ==================================================
export const companies = pgTable("companies", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    industry: varchar("industry", { length: 255 }),
    country: varchar("country", { length: 50 }),
    province: varchar("province", { length: 100 }),
    city: varchar("city", { length: 100 }),
    postalCode: varchar("postal_code", { length: 20 }),
    website: varchar("website", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertCompanySchema = createInsertSchema(companies).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// ==================================================
// CONTACTS
// ==================================================
export const contacts = pgTable("contacts", {
    id: uuid("id").defaultRandom().primaryKey(),
    companyId: uuid("company_id").references(() => companies.id),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    role: varchar("role", { length: 50 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertContactSchema = createInsertSchema(contacts).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// ==================================================
// DEALS / PIPELINE
// ==================================================
export const deals = pgTable("deals", {
    id: uuid("id").defaultRandom().primaryKey(),
    contactId: uuid("contact_id").references(() => contacts.id),
    companyId: uuid("company_id").references(() => companies.id),
    stage: varchar("stage", { length: 50 }).default("New"),
    amount: numeric("amount", { precision: 12, scale: 2 }),
    category: varchar("category", { length: 100 }),
    notes: text("notes"),
    assignedTo: uuid("assigned_to").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertDealSchema = createInsertSchema(deals).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// ==================================================
// DOCUMENTS
// ==================================================
export const documents = pgTable("documents", {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id"),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }),
    documentType: varchar("document_type", { length: 100 }),
    s3Key: varchar("s3_key", { length: 512 }),
    checksum: varchar("checksum", { length: 128 }),
    sizeBytes: integer("size_bytes"),
    mimeType: varchar("mime_type", { length: 255 }),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    tags: text("tags"),
    version: integer("version").default(1),
    accepted: boolean("accepted").default(false),
    rejected: boolean("rejected").default(false),
    reason: text("reason"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertDocumentSchema = createInsertSchema(documents).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// ==================================================
// LENDERS
// ==================================================
export const lenders = pgTable("lenders", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    country: varchar("country", { length: 50 }),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertLenderSchema = createInsertSchema(lenders).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// ==================================================
// LENDER PRODUCTS
// ==================================================
export const lenderProducts = pgTable("lender_products", {
    id: uuid("id").defaultRandom().primaryKey(),
    lenderId: uuid("lender_id").references(() => lenders.id),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", { length: 100 }),
    country: varchar("country", { length: 50 }),
    minAmount: numeric("min_amount", { precision: 12, scale: 2 }),
    maxAmount: numeric("max_amount", { precision: 12, scale: 2 }),
    rate: numeric("rate", { precision: 5, scale: 2 }),
    description: text("description"),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertLenderProductSchema = createInsertSchema(lenderProducts).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// ==================================================
// APPLICATIONS
// ==================================================
export const applications = pgTable("applications", {
    id: uuid("id").defaultRandom().primaryKey(),
    contactId: uuid("contact_id").references(() => contacts.id),
    companyId: uuid("company_id").references(() => companies.id),
    lenderId: uuid("lender_id").references(() => lenders.id),
    lenderProductId: uuid("lender_product_id").references(() => lenderProducts.id),
    status: varchar("status", { length: 50 }).default("New"),
    amountRequested: numeric("amount_requested", { precision: 12, scale: 2 }),
    purpose: text("purpose"),
    notes: text("notes"),
    score: numeric("score", { precision: 5, scale: 2 }),
    likelihood: numeric("likelihood", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertApplicationSchema = createInsertSchema(applications).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// ==================================================
// TASKS (Primary, single definitive version)
// ==================================================
export const tasks = pgTable("tasks", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    dueDate: timestamp("due_date"),
    completed: boolean("completed").default(false),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertTaskSchema = createInsertSchema(tasks).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// ==================================================
// API HEALTH CHECKS (Single definitive version)
// ==================================================
export const apiHealthChecks = pgTable("api_health_checks", {
    id: uuid("id").defaultRandom().primaryKey(),
    service: varchar("service", { length: 255 }),
    status: varchar("status", { length: 50 }),
    latencyMs: integer("latency_ms"),
    checkedAt: timestamp("checked_at").defaultNow(),
});
export const insertApiHealthCheckSchema = createInsertSchema(apiHealthChecks).omit({
    id: true,
    checkedAt: true,
});
// ==================================================
// RETRY QUEUE
// ==================================================
export const retryQueue = pgTable("retry_queue", {
    id: uuid("id").defaultRandom().primaryKey(),
    taskType: varchar("task_type", { length: 100 }),
    payload: jsonb("payload").$type(),
    attempts: integer("attempts").default(0),
    nextAttemptAt: timestamp("next_attempt_at"),
    status: varchar("status", { length: 50 }).default("pending"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertRetryQueueSchema = createInsertSchema(retryQueue).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});
// ==================================================
// FINAL EXPORTS
// ==================================================
export * from "./marketing-schema";
console.log("[SCHEMA] shared/schema.ts loaded successfully with no duplicate exports");
