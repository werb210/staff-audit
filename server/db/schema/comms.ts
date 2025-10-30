import { pgTable, text, timestamp, uuid, varchar, boolean, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const commThreads = pgTable("comm_threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull(), // FK to your contacts table
  channel: varchar("channel", { length: 16 }).notNull(), // 'sms' | 'email' | 'call'
  subject: text("subject"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const commMessages = pgTable("comm_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  threadId: uuid("thread_id").notNull(),
  direction: varchar("direction", { length: 8 }).notNull(), // 'in' | 'out'
  channel: varchar("channel", { length: 16 }).notNull(), // 'sms' | 'email'
  body: text("body").notNull(),
  meta: text("meta"), // JSON string (twilio sid, subject, etc.)
  createdByUserId: uuid("created_by_user_id"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const commCalls = pgTable("comm_calls", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull(),
  direction: varchar("direction", { length: 8 }).notNull(), // 'in' | 'out'
  status: varchar("status", { length: 32 }).notNull().default("queued"),
  twilioSid: varchar("twilio_sid", { length: 64 }),
  fromNumber: varchar("from_number", { length: 32 }).notNull(),
  toNumber: varchar("to_number", { length: 32 }).notNull(),
  durationSec: integer("duration_sec"),
  recordingUrl: text("recording_url"),
  transcript: text("transcript"),
  createdByUserId: uuid("created_by_user_id"),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
});

export const commTemplates = pgTable("comm_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 128 }).notNull(),
  channel: varchar("channel", { length: 16 }).notNull(), // 'sms' | 'email'
  subject: varchar("subject", { length: 256 }),
  body: text("body").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export const commRelations = relations(commThreads, ({ many }) => ({
  messages: many(commMessages),
}));