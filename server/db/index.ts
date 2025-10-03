// Database repository layer integration
import { usersRepo } from "./repo/users";
import { contactsRepo } from "./repo/contacts";
import { appsRepo } from "./repo/apps";
import { lenderProductsRepo } from "./repo/lenderProducts";
import { lenderReportsRepo } from "./repo/lenderReports";
import { marketingRepo } from "./repo/marketing";
import { auditRepo } from "./repo/audit";

// Re-export db from the main db module
export { db } from "./client";

// Export the complete repository system
export const dbRepos = {
  users: usersRepo,
  contacts: contactsRepo,
  apps: appsRepo,
  lenderProducts: lenderProductsRepo,
  lenderReports: lenderReportsRepo,
  marketing: marketingRepo,
  audit: auditRepo
};

export type DbRepos = typeof dbRepos;