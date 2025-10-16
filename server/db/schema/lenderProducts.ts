import { pgTable, text, varchar, integer, timestamp, boolean, real } from "drizzle-orm/pg-core";

// Schema matching actual database structure
export const lenderProducts = pgTable("lender_products", {
  id: varchar("id").primaryKey(),
  lenderName: varchar("lender_name"),
  productName: varchar("product_name"),
  category: text("category"),
  country: varchar("country"),
  minAmount: integer("minimum_lending_amount"),
  maxAmount: integer("maximum_lending_amount"),
  interestRate: text("interest_rate_minimum"),
  termLength: integer("term_minimum"),
  documentsRequired: text("documents_required").array(),
  description: text("description"),
  active: boolean("is_active"),
  updatedAt: timestamp("updated_at"),
});

export type LenderProduct = typeof lenderProducts.$inferSelect;
export type CreateLenderProduct = typeof lenderProducts.$inferInsert;