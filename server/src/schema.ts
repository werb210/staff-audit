import { pgTable, serial, text, timestamp, integer } from 'drizzle-orm/pg-core';

export const applications = pgTable('applications', {
  id: serial('id').primaryKey(),
  business_name: text('business_name').notNull(),
  amount: integer('amount').default(0).notNull(),
  stage: text('stage').default('New').notNull(),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});

export const contacts = pgTable('contacts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  createdAt: timestamp('createdAt').defaultNow().notNull(),
});
