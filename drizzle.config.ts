import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./server/db/schema.ts",
  out: "./drizzle",
<<<<<<< Updated upstream
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL || "postgres://node:node@localhost:5432/staff",
=======
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
>>>>>>> Stashed changes
  },
});
