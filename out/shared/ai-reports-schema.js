import { pgTable, uuid, text, timestamp, serial, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { users } from './schema';
// AI Reports Database Schema for Session-Based Conversation Tracking
// Applicant Sessions Table - tracks conversation sessions by business/applicant
export const applicantSessions = pgTable("applicant_sessions", {
    sessionId: uuid("session_id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    businessName: text("business_name").notNull(),
    userEmail: varchar("user_email", { length: 255 }),
    userPhone: varchar("user_phone", { length: 20 }),
    startTime: timestamp("start_time").defaultNow().notNull(),
    endTime: timestamp("end_time"),
    totalMessages: serial("total_messages").default(0),
    tenantId: uuid("tenant_id"), // Tenant reference (table not yet defined)
    metadata: text("metadata"), // JSON string for additional session data
    status: varchar("status", { length: 20 }).default("active"), // active, completed, abandoned
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
// Session Messages Table - stores individual chat messages with context
export const sessionMessages = pgTable("session_messages", {
    id: serial("id").primaryKey(),
    sessionId: uuid("session_id").references(() => applicantSessions.sessionId).notNull(),
    role: varchar("role", { length: 10 }).notNull(), // 'user' or 'bot'
    message: text("message").notNull(),
    page: text("page"), // URL or page name for context
    timestamp: timestamp("timestamp").defaultNow().notNull(),
    messageIndex: serial("message_index"), // Order within session
    metadata: text("metadata"), // Additional message context as JSON
});
// Validation schemas
export const insertApplicantSessionSchema = createInsertSchema(applicantSessions).omit({
    sessionId: true,
    createdAt: true,
    updatedAt: true,
});
export const insertSessionMessageSchema = createInsertSchema(sessionMessages).omit({
    id: true,
    timestamp: true,
});
export const selectApplicantSessionSchema = createSelectSchema(applicantSessions);
export const selectSessionMessageSchema = createSelectSchema(sessionMessages);
