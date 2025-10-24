import { pgTable, text, timestamp, boolean, integer, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

/**
 * Call Logs Table
 * Tracks all call actions (accept, decline, missed) with staff attribution
 */
export const callLogs = pgTable('call_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  callSid: text('call_sid').notNull().unique(),
  fromNumber: text('from_number').notNull(),
  toNumber: text('to_number').notNull(),
  staffId: text('staff_id'),
  action: text('action').notNull(), // 'accepted', 'declined', 'missed', 'failed'
  reason: text('reason'),
  duration: integer('duration'), // Call duration in seconds
  timestamp: timestamp('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * Missed Calls Table
 * Specific tracking for missed calls requiring escalation
 */
export const missedCalls = pgTable('missed_calls', {
  id: uuid('id').defaultRandom().primaryKey(),
  callSid: text('call_sid').notNull().unique(),
  fromNumber: text('from_number').notNull(),
  toNumber: text('to_number').notNull(),
  reason: text('reason').notNull().default('unanswered'),
  staffId: text('staff_id'),
  handled: boolean('handled').default(false).notNull(),
  handledBy: text('handled_by'),
  handledAt: timestamp('handled_at'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Zod schemas for validation
export const insertCallLogSchema = createInsertSchema(callLogs, {
  callSid: z.string().min(1, 'Call SID is required'),
  fromNumber: z.string().min(1, 'From number is required'),
  toNumber: z.string().min(1, 'To number is required'),
  action: z.enum(['accepted', 'declined', 'missed', 'failed']),
  duration: z.number().min(0).optional(),
} as any);

export const insertMissedCallSchema = createInsertSchema(missedCalls, {
  callSid: z.string().min(1, 'Call SID is required'),
  fromNumber: z.string().min(1, 'From number is required'),
  toNumber: z.string().min(1, 'To number is required'),
  reason: z.string().default('unanswered'),
} as any);

// TypeScript types
export type CallLog = typeof callLogs.$inferSelect;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;
export type MissedCall = typeof missedCalls.$inferSelect;
export type InsertMissedCall = z.infer<typeof insertMissedCallSchema>;
