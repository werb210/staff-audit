/**
 * Upload Status Tracking Schema
 * Tracks the complete upload pipeline status for every document
 */

import { pgTable, uuid, varchar, boolean, timestamp, text } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

export const documentUploadLogs = pgTable('document_upload_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull(),
  applicationId: uuid('application_id'),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  diskStatus: varchar('disk_status', { length: 50 }).notNull(), // 'saved' | 'failed' | 'missing'
  backupStatus: varchar('backup_status', { length: 50 }).notNull(), // 'saved' | 'failed' | 'missing'
  checksumVerified: boolean('checksum_verified').notNull().default(false),
  sizeVerified: boolean('size_verified').notNull().default(false),
  expectedSize: varchar('expected_size', { length: 20 }),
  actualSize: varchar('actual_size', { length: 20 }),
  expectedChecksum: varchar('expected_checksum', { length: 64 }),
  actualChecksum: varchar('actual_checksum', { length: 64 }),
  errorMessage: text('error_message'),
  uploadTimestamp: timestamp('upload_timestamp').notNull().defaultNow(),
  validationTimestamp: timestamp('validation_timestamp'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const insertUploadLogSchema = createInsertSchema(documentUploadLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const selectUploadLogSchema = createSelectSchema(documentUploadLogs);

export type UploadLog = typeof documentUploadLogs.$inferSelect;
export type InsertUploadLog = z.infer<typeof insertUploadLogSchema>;
