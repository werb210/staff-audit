import { pgTable, text, timestamp, jsonb, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Contacts table with tenant isolation
export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: text('tenant_id').notNull(), // 'bf' or 'slf'
  first_name: text('first_name').notNull(),
  last_name: text('last_name').notNull(),
  email: text('email'),
  phone: text('phone'),
  company: text('company'),
  lifecycle_stage: text('lifecycle_stage').default('Lead'), // Lead, MQL, SQL, Customer
  owner_user_id: text('owner_user_id'),
  tags: jsonb('tags').$type<string[]>().default([]),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Contact activities (calls, SMS, emails, meetings)
export const contactActivities = pgTable('contact_activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: text('tenant_id').notNull(),
  contact_id: uuid('contact_id').references(() => contacts.id),
  type: text('type').notNull(), // 'call', 'sms', 'email', 'meeting', 'note'
  direction: text('direction'), // 'inbound', 'outbound'
  status: text('status'), // 'completed', 'missed', 'failed', 'delivered'
  duration: text('duration'), // call duration in seconds
  summary: text('summary'),
  metadata: jsonb('metadata').$type<Record<string, any>>().default({}),
  created_at: timestamp('created_at').defaultNow(),
  actor_user_id: text('actor_user_id')
});

// Contact notes
export const contactNotes = pgTable('contact_notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: text('tenant_id').notNull(),
  contact_id: uuid('contact_id').references(() => contacts.id),
  content: text('content').notNull(),
  author_user_id: text('author_user_id').notNull(),
  created_at: timestamp('created_at').defaultNow()
});

// Contact tasks
export const contactTasks = pgTable('contact_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: text('tenant_id').notNull(),
  contact_id: uuid('contact_id').references(() => contacts.id),
  title: text('title').notNull(),
  description: text('description'),
  due_date: timestamp('due_date'),
  status: text('status').default('pending'), // 'pending', 'completed', 'cancelled'
  assigned_user_id: text('assigned_user_id'),
  created_at: timestamp('created_at').defaultNow()
});

// Contact documents
export const contactDocuments = pgTable('contact_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: text('tenant_id').notNull(),
  contact_id: uuid('contact_id').references(() => contacts.id),
  filename: text('filename').notNull(),
  s3_key: text('s3_key').notNull(),
  mime_type: text('mime_type'),
  file_size: text('file_size'),
  uploaded_by: text('uploaded_by'),
  created_at: timestamp('created_at').defaultNow()
});

// Zod schemas
export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  created_at: true,
  updated_at: true
});

export const insertContactActivitySchema = createInsertSchema(contactActivities).omit({
  id: true,
  created_at: true
});

export const insertContactNoteSchema = createInsertSchema(contactNotes).omit({
  id: true,
  created_at: true
});

export const insertContactTaskSchema = createInsertSchema(contactTasks).omit({
  id: true,
  created_at: true
});

export const insertContactDocumentSchema = createInsertSchema(contactDocuments).omit({
  id: true,
  created_at: true
});

// Types
export type Contact = typeof contacts.$inferSelect;
export type ContactActivity = typeof contactActivities.$inferSelect;
export type ContactNote = typeof contactNotes.$inferSelect;
export type ContactTask = typeof contactTasks.$inferSelect;
export type ContactDocument = typeof contactDocuments.$inferSelect;

export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertContactActivity = z.infer<typeof insertContactActivitySchema>;
export type InsertContactNote = z.infer<typeof insertContactNoteSchema>;
export type InsertContactTask = z.infer<typeof insertContactTaskSchema>;
export type InsertContactDocument = z.infer<typeof insertContactDocumentSchema>;