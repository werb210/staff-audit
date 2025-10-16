import { pgTable, uuid, varchar, text, integer, numeric, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 32 }).notNull().unique(),
  role: varchar('role', { length: 32 }).notNull(),          // admin | staff | marketing | lender | referrer
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

export const contacts = pgTable('contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 32 }),
  ownerId: uuid('owner_id').references(()=>users.id),
  tags: text('tags'),                            // comma-separated
  createdAt: timestamp('created_at').defaultNow()
});

export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').references(()=>contacts.id),
  legal_business_name: varchar('legal_business_name', { length: 255 }),
  loan_amount: numeric('loan_amount', { precision: 14, scale: 2 }),
  submission_country: text('submission_country'),
  product_category: varchar('product_category', { length: 64 }),
  application_canon: jsonb('application_canon').notNull().default({}),
  created_at: timestamp('created_at').defaultNow()
});

export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').references(()=>applications.id).notNull(),
  category: varchar('category', { length: 64 }).notNull(),   // Balance Sheet, Bank Statements, etc.
  name: varchar('name', { length: 255 }).notNull(),
  s3Key: text('s3_key').notNull(),
  contentType: varchar('content_type', { length: 128 }).notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  version: integer('version').notNull().default(1),
  status: varchar('status', { length: 32 }).notNull().default('pending'), // pending|accepted|rejected
  rejectReason: text('reject_reason'),
  uploadedBy: varchar('uploaded_by', { length: 64 }).notNull(), // client-portal|staff
  createdAt: timestamp('created_at').defaultNow()
});

export const lenderProducts = pgTable('lender_products', {
  id: uuid('id').defaultRandom().primaryKey(),
  lender: varchar('lender', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  country: varchar('country', { length: 32 }).notNull(),               // Canada | USA
  category: varchar('category', { length: 64 }).notNull(),             // Term Loan | Equipment Financing | Business Line of Credit
  minAmount: numeric('min_amount', { precision: 14, scale: 2 }).notNull(),
  maxAmount: numeric('max_amount', { precision: 14, scale: 2 }).notNull(),
  minRate: numeric('min_rate', { precision: 5, scale: 2 }).notNull(),
  maxRate: numeric('max_rate', { precision: 5, scale: 2 }).notNull(),
  minTerm: integer('min_term').notNull(),
  maxTerm: integer('max_term').notNull(),
  notes: text('notes')
});

export const comms = pgTable('comms', {
  id: uuid('id').defaultRandom().primaryKey(),
  contactId: uuid('contact_id').references(()=>contacts.id),
  kind: varchar('kind', { length: 32 }).notNull(),            // sms|email|call|note|task|meeting
  direction: varchar('direction', { length: 16 }),            // in|out (for sms/call/email)
  subject: text('subject'),
  body: text('body'),
  meta: text('meta'),
  createdAt: timestamp('created_at').defaultNow()
});

export const audits = pgTable('audits', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: varchar('type', { length: 64 }).notNull(),
  entity: varchar('entity', { length: 64 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  userId: uuid('user_id'),
  data: text('data'),
  createdAt: timestamp('created_at').defaultNow()
});