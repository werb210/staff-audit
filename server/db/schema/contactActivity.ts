import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const contactActivity = pgTable("contact_activity", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull(),
  type: varchar("type", { length: 16 }).notNull(),
  direction: varchar("direction", { length: 8 }).notNull(),
  title: text("title"),
  body: text("body"),
  meta: text("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});