// packages/db/schema.ts
import { pgTable, varchar, uuid, numeric, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";

// Canonical lenders table definition
export const lenders = pgTable("lenders", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name").notNull(),
  companyName: varchar("company_name").notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  website: text("website"),
  description: text("description"),
  country: varchar("country").notNull().default("US"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Canonical lender products table definition  
export const lenderProducts = pgTable("lender_products", {
  id: varchar("id", { length: 50 }).primaryKey(), // Match existing schema
  name: varchar("name", { length: 255 }).notNull(),
  lenderId: uuid("lender_id").references(() => lenders.id),
  lenderName: varchar("lender_name", { length: 255 }),
  productName: varchar("product_name", { length: 255 }),
  category: varchar("category").notNull(),
  country: varchar("country").notNull(),
  minimumLendingAmount: integer("minimum_lending_amount"),
  maximumLendingAmount: integer("maximum_lending_amount"),
  interestRateMinimum: numeric("interest_rate_minimum"),
  interestRateMaximum: numeric("interest_rate_maximum"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Type exports for use across applications
export type Lender = typeof lenders.$inferSelect;
export type InsertLender = typeof lenders.$inferInsert;
export type LenderProduct = typeof lenderProducts.$inferSelect;
export type InsertLenderProduct = typeof lenderProducts.$inferInsert;