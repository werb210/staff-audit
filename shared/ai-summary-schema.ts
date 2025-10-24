/**
 * AI Credit Summary Schema
 * Database tables for AI-generated credit summaries with training feedback
 */

import { pgTable, uuid, text, timestamp, jsonb, boolean, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { applications, users } from './schema';

// AI Credit Summaries Table
export const creditSummaries = pgTable('credit_summaries', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  
  // AI Generated Content
  originalSummary: text('original_summary'),
  finalSummary: text('final_summary'),
  
  // Template and Generation Info
  templateUsed: text('template_used').default('Credit Write Up - Template.docx'),
  aiModel: text('ai_model').default('gpt-4'),
  generationPrompt: text('generation_prompt'),
  
  // Document Export
  pdfExported: boolean('pdf_exported').default(false),
  pdfS3Key: text('pdf_s3_key'),
  pdfS3Bucket: text('pdf_s3_bucket'),
  pdfFilename: text('pdf_filename'),
  
  // Status and Workflow
  status: text('status').notNull().default('draft'), // 'draft', 'final', 'locked'
  isDraft: boolean('is_draft').default(true),
  isLocked: boolean('is_locked').default(false),
  
  // Metadata
  wordCount: integer('word_count'),
  characterCount: integer('character_count'),
  sections: jsonb('sections'), // Store section breakdown
  
  // Audit Trail
  createdBy: uuid('created_by').references(() => users.id),
  editedBy: uuid('edited_by').references(() => users.id),
  lockedBy: uuid('locked_by').references(() => users.id),
  lockedAt: timestamp('locked_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// AI Training Feedback Table
export const creditSummaryTraining = pgTable('credit_summary_training', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id),
  creditSummaryId: uuid('credit_summary_id').notNull().references(() => creditSummaries.id, { onDelete: 'cascade' }),
  
  // Training Data
  originalSummary: text('original_summary').notNull(),
  finalEditedSummary: text('final_edited_summary').notNull(),
  delta: jsonb('delta').notNull(), // JSON diff of original vs edited
  
  // Analysis
  editTypes: jsonb('edit_types'), // Categories of edits made
  editIntensity: text('edit_intensity'), // 'minor', 'moderate', 'major'
  contentChanges: jsonb('content_changes'), // What content was changed
  
  // Editor Information
  editedBy: uuid('edited_by').notNull().references(() => users.id),
  editorExperience: text('editor_experience'), // 'junior', 'senior', 'expert'
  editingTime: integer('editing_time'), // Time spent editing in seconds
  
  // Learning Metrics
  improvementScore: integer('improvement_score'), // 1-10 quality improvement
  confidenceScore: integer('confidence_score'), // 1-10 AI confidence in original
  
  timestamp: timestamp('timestamp').defaultNow(),
  createdAt: timestamp('created_at').defaultNow()
});

// AI Summary Templates Table
export const creditSummaryTemplates = pgTable('credit_summary_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  name: text('name').notNull(),
  description: text('description'),
  templateContent: text('template_content').notNull(),
  
  // Template Structure
  sections: jsonb('sections').notNull(), // Required sections
  fields: jsonb('fields').notNull(), // Required data fields
  prompts: jsonb('prompts'), // AI prompts for each section
  
  // Usage and Performance
  usageCount: integer('usage_count').default(0),
  averageQuality: integer('average_quality'), // 1-10 based on feedback
  
  // Version Control
  version: text('version').default('1.0'),
  isActive: boolean('is_active').default(true),
  isDefault: boolean('is_default').default(false),
  
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Insert Schemas
export const insertCreditSummarySchema = createInsertSchema(creditSummaries).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertCreditSummaryTrainingSchema = createInsertSchema(creditSummaryTraining).omit({
  id: true,
  createdAt: true,
  timestamp: true
} as any);

export const insertCreditSummaryTemplateSchema = createInsertSchema(creditSummaryTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

// Types
export type CreditSummary = typeof creditSummaries.$inferSelect;
export type InsertCreditSummary = z.infer<typeof insertCreditSummarySchema>;

export type CreditSummaryTraining = typeof creditSummaryTraining.$inferSelect;
export type InsertCreditSummaryTraining = z.infer<typeof insertCreditSummaryTrainingSchema>;

export type CreditSummaryTemplate = typeof creditSummaryTemplates.$inferSelect;
export type InsertCreditSummaryTemplate = z.infer<typeof insertCreditSummaryTemplateSchema>;

// AI Summary Status Types
export type SummaryStatus = 'draft' | 'final' | 'locked';
export type EditIntensity = 'minor' | 'moderate' | 'major';
export type EditorExperience = 'junior' | 'senior' | 'expert';
