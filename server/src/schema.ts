import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  business_name: text('business_name').notNull(),
  amount: integer('amount').default(0).notNull(),
  stage: text('stage').default('New').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});
