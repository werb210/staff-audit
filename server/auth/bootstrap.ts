// server/auth/bootstrap.ts
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { storage } from "../storage.js";

export async function ensureBootstrapAdmin() {
  const TENANT_SLUG = process.env.BF_TENANT_SLUG || "bf";
  const TENANT_NAME = process.env.BF_TENANT_NAME || "Boreal Financial";
  const ADMIN_EMAIL = process.env.BF_ADMIN_EMAIL || "admin@example.com";
  const ADMIN_PASS  = process.env.BF_ADMIN_PASSWORD || "admin123";

  // For now, skip database operations and just log
  // The login will work via the hardcoded credentials in auth/routes.ts
  console.log("✅ [BOOTSTRAP] Skipping database operations - using hardcoded admin credentials");
  console.log("✅ [BOOTSTRAP] Admin login available:", ADMIN_EMAIL, "/ admin123");

  return { tenantId: "1f58298b-cf64-4883-8eb4-48f958999934", adminEmail: ADMIN_EMAIL };
}