import { pgTable, text, boolean, timestamp, uuid } from "drizzle-orm/pg-core";

export const lenders = pgTable("lenders", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  website: text("website"),
  phone: text("phone"),
  notes: text("notes"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});