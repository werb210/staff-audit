import { z } from "zod";
import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  timestamp,
  boolean,
  uuid,
  numeric,
  jsonb,
  primaryKey,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// ==================================================
// USERS
// ==================================================
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: varchar("role", { length: 50 }).default("Staff"),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  phone: varchar("phone", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ==================================================
// COMPANIES
// ==================================================
export const companies = pgTable("companies", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  industry: varchar("industry", { length: 255 }),
  country: varchar("country", { length: 50 }),
  province: varchar("province", { length: 100 }),
  city: varchar("city", { length: 100 }),
  postalCode: varchar("postal_code", { length: 20 }),
  website: varchar("website", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// ==================================================
// CONTACTS
// ==================================================
export const contacts = pgTable("contacts", {
  id: uuid("id").defaultRandom().primaryKey(),
  companyId: uuid("company_id").references(() => companies.id),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  role: varchar("role", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Contact = typeof contacts.$inferSelect;

// ==================================================
// DEALS / PIPELINE
// ==================================================
export const deals = pgTable("deals", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id").references(() => contacts.id),
  companyId: uuid("company_id").references(() => companies.id),
  stage: varchar("stage", { length: 50 }).default("New"),
  amount: numeric("amount", { precision: 12, scale: 2 }),
  category: varchar("category", { length: 100 }),
  notes: text("notes"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDealSchema = createInsertSchema(deals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertDeal = z.infer<typeof insertDealSchema>;
export type Deal = typeof deals.$inferSelect;

// ==================================================
// DOCUMENTS
// ==================================================
export const documents = pgTable("documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id"),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  documentType: varchar("document_type", { length: 100 }),
  s3Key: varchar("s3_key", { length: 512 }),
  checksum: varchar("checksum", { length: 128 }),
  sizeBytes: integer("size_bytes"),
  mimeType: varchar("mime_type", { length: 255 }),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  tags: text("tags"),
  version: integer("version").default(1),
  accepted: boolean("accepted").default(false),
  rejected: boolean("rejected").default(false),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documents.$inferSelect;

// ==================================================
// LENDERS
// ==================================================
export const lenders = pgTable("lenders", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  country: varchar("country", { length: 50 }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLenderSchema = createInsertSchema(lenders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertLender = z.infer<typeof insertLenderSchema>;
export type Lender = typeof lenders.$inferSelect;

// ==================================================
// LENDER PRODUCTS
// ==================================================
export const lenderProducts = pgTable("lender_products", {
  id: uuid("id").defaultRandom().primaryKey(),
  lenderId: uuid("lender_id").references(() => lenders.id),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  country: varchar("country", { length: 50 }),
  minAmount: numeric("min_amount", { precision: 12, scale: 2 }),
  maxAmount: numeric("max_amount", { precision: 12, scale: 2 }),
  rate: numeric("rate", { precision: 5, scale: 2 }),
  description: text("description"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertLenderProductSchema = createInsertSchema(lenderProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertLenderProduct = z.infer<typeof insertLenderProductSchema>;
export type LenderProduct = typeof lenderProducts.$inferSelect;
// ==================================================
// APPLICATIONS
// ==================================================
export const applications = pgTable("applications", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id").references(() => contacts.id),
  companyId: uuid("company_id").references(() => companies.id),
  lenderId: uuid("lender_id").references(() => lenders.id),
  lenderProductId: uuid("lender_product_id").references(() => lenderProducts.id),
  status: varchar("status", { length: 50 }).default("New"),
  amountRequested: numeric("amount_requested", { precision: 12, scale: 2 }),
  purpose: text("purpose"),
  notes: text("notes"),
  score: numeric("score", { precision: 5, scale: 2 }),
  likelihood: numeric("likelihood", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type Application = typeof applications.$inferSelect;

// ==================================================
// OCR RESULTS
// ==================================================
export const ocrResults = pgTable("ocr_results", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id),
  field: varchar("field", { length: 255 }),
  value: text("value"),
  confidence: numeric("confidence", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertOcrResultSchema = createInsertSchema(ocrResults).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertOcrResult = z.infer<typeof insertOcrResultSchema>;
export type OcrResult = typeof ocrResults.$inferSelect;

// ==================================================
// OCR DOCUMENTS
// ==================================================
export const ocrDocuments = pgTable("ocr_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id").references(() => applications.id),
  documentType: varchar("document_type", { length: 100 }),
  extractedData: jsonb("extracted_data"),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertOcrDocumentSchema = createInsertSchema(ocrDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertOcrDocument = z.infer<typeof insertOcrDocumentSchema>;
export type OcrDocument = typeof ocrDocuments.$inferSelect;

// ==================================================
// BANKING ANALYSIS
// ==================================================
export const bankingAnalysis = pgTable("banking_analysis", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id").references(() => applications.id),
  avgBalance: numeric("avg_balance", { precision: 12, scale: 2 }),
  maxBalance: numeric("max_balance", { precision: 12, scale: 2 }),
  nsfCount: integer("nsf_count"),
  inflowTotal: numeric("inflow_total", { precision: 12, scale: 2 }),
  outflowTotal: numeric("outflow_total", { precision: 12, scale: 2 }),
  summary: text("summary"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertBankingAnalysisSchema = createInsertSchema(bankingAnalysis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertBankingAnalysis = z.infer<typeof insertBankingAnalysisSchema>;
export type BankingAnalysis = typeof bankingAnalysis.$inferSelect;

// ==================================================
// PIPELINE STAGES
// ==================================================
export const pipelineStages = pgTable("pipeline_stages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }),
  position: integer("position"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertPipelineStageSchema = createInsertSchema(pipelineStages).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
export type PipelineStage = typeof pipelineStages.$inferSelect;

// ==================================================
// TASKS (Primary)
// ==================================================
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  completed: boolean("completed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;

// ==================================================
// COMMUNICATION LOGS
// ==================================================
export const communications = pgTable("communications", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id").references(() => contacts.id),
  type: varchar("type", { length: 50 }),
  direction: varchar("direction", { length: 50 }),
  content: text("content"),
  timestamp: timestamp("timestamp").defaultNow(),
  status: varchar("status", { length: 50 }),
});
export const insertCommunicationSchema = createInsertSchema(communications).omit({
  id: true,
  timestamp: true,
} as const);
export type InsertCommunication = z.infer<typeof insertCommunicationSchema>;
export type Communication = typeof communications.$inferSelect;

// ==================================================
// APPROVAL REQUESTS
// ==================================================
export const approvalRequests = pgTable("approval_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: uuid("entity_id"),
  status: varchar("status", { length: 50 }).default("Pending"),
  decisionBy: uuid("decision_by").references(() => users.id),
  decisionAt: timestamp("decision_at"),
  comments: text("comments"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
// ==================================================
// USER AUDIT LOG
// ==================================================
export const userAuditLog = pgTable("user_audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 255 }).notNull(),
  entity: varchar("entity", { length: 255 }),
  entityId: uuid("entity_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertUserAuditLogSchema = createInsertSchema(userAuditLog).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertUserAuditLog = z.infer<typeof insertUserAuditLogSchema>;
export type UserAuditLog = typeof userAuditLog.$inferSelect;

// ==================================================
// INTEGRATIONS (Office 365, Google, LinkedIn, etc.)
// ==================================================
export const integrations = pgTable("integrations", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  provider: varchar("provider", { length: 100 }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at"),
  connected: boolean("connected").default(false),
  scopes: text("scopes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrations.$inferSelect;

// ==================================================
// REPORTS
// ==================================================
export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  type: varchar("type", { length: 100 }),
  description: text("description"),
  data: jsonb("data"),
  generatedBy: uuid("generated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// ==================================================
// MARKETING CAMPAIGNS
// ==================================================
export const marketingCampaigns = pgTable("marketing_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  channel: varchar("channel", { length: 100 }),
  budget: numeric("budget", { precision: 12, scale: 2 }),
  spent: numeric("spent", { precision: 12, scale: 2 }),
  impressions: integer("impressions"),
  clicks: integer("clicks"),
  conversions: integer("conversions"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertMarketingCampaign = z.infer<typeof insertMarketingCampaignSchema>;
export type MarketingCampaign = typeof marketingCampaigns.$inferSelect;

// ==================================================
// REFERRERS
// ==================================================
export const referrers = pgTable("referrers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  company: varchar("company", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertReferrerSchema = createInsertSchema(referrers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertReferrer = z.infer<typeof insertReferrerSchema>;
export type Referrer = typeof referrers.$inferSelect;

// ==================================================
// REFERRAL TRACKING
// ==================================================
export const referrals = pgTable("referrals", {
  id: uuid("id").defaultRandom().primaryKey(),
  referrerId: uuid("referrer_id").references(() => referrers.id),
  applicationId: uuid("application_id").references(() => applications.id),
  status: varchar("status", { length: 50 }),
  commissionAmount: numeric("commission_amount", { precision: 12, scale: 2 }),
  paid: boolean("paid").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertReferralSchema = createInsertSchema(referrals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertReferral = z.infer<typeof insertReferralSchema>;
export type Referral = typeof referrals.$inferSelect;

// ==================================================
// AI SUMMARIES
// ==================================================
export const aiSummaries = pgTable("ai_summaries", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id").references(() => applications.id),
  content: text("content"),
  riskScore: numeric("risk_score", { precision: 5, scale: 2 }),
  fraudFlag: boolean("fraud_flag").default(false),
  generatedAt: timestamp("generated_at").defaultNow(),
});
export const insertAiSummarySchema = createInsertSchema(aiSummaries).omit({
  id: true,
  generatedAt: true,
} as const);
export type InsertAiSummary = z.infer<typeof insertAiSummarySchema>;
export type AiSummary = typeof aiSummaries.$inferSelect;

// ==================================================
// CHAT MESSAGES
// ==================================================
export const chatMessages = pgTable("chat_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id").references(() => contacts.id),
  userId: uuid("user_id").references(() => users.id),
  role: varchar("role", { length: 50 }),
  message: text("message"),
  sentAt: timestamp("sent_at").defaultNow(),
});
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  sentAt: true,
} as const);
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;

// ==================================================
// NOTIFICATIONS
// ==================================================
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  title: varchar("title", { length: 255 }),
  message: text("message"),
  read: boolean("read").default(false),
  type: varchar("type", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
// ==================================================
// AI TRAINING LOGS
// ==================================================
export const aiTrainingLogs = pgTable("ai_training_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  model: varchar("model", { length: 255 }),
  dataset: varchar("dataset", { length: 255 }),
  accuracy: numeric("accuracy", { precision: 5, scale: 2 }),
  loss: numeric("loss", { precision: 5, scale: 2 }),
  epoch: integer("epoch"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAiTrainingLogSchema = createInsertSchema(aiTrainingLogs).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertAiTrainingLog = z.infer<typeof insertAiTrainingLogSchema>;
export type AiTrainingLog = typeof aiTrainingLogs.$inferSelect;

// ==================================================
// API HEALTH CHECKS (Single definitive version)
// ==================================================
export const apiHealthChecks = pgTable("api_health_checks", {
  id: uuid("id").defaultRandom().primaryKey(),
  service: varchar("service", { length: 255 }),
  status: varchar("status", { length: 50 }),
  latencyMs: integer("latency_ms"),
  checkedAt: timestamp("checked_at").defaultNow(),
});
export const insertApiHealthCheckSchema = createInsertSchema(apiHealthChecks).omit({
  id: true,
  checkedAt: true,
} as const);
export type InsertApiHealthCheck = z.infer<typeof insertApiHealthCheckSchema>;
export type ApiHealthCheck = typeof apiHealthChecks.$inferSelect;

// ==================================================
// RETRY QUEUE (Unified schema)
// ==================================================
export const retryQueue = pgTable("retry_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskType: varchar("task_type", { length: 100 }),
  payload: jsonb("payload"),
  attempts: integer("attempts").default(0),
  nextAttemptAt: timestamp("next_attempt_at"),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertRetryQueueSchema = createInsertSchema(retryQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertRetryQueue = z.infer<typeof insertRetryQueueSchema>;
export type RetryQueue = typeof retryQueue.$inferSelect;

// ==================================================
// AUDIT LOGS
// ==================================================
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: varchar("action", { length: 255 }),
  userId: uuid("user_id").references(() => users.id),
  details: jsonb("details"),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: uuid("entity_id"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ==================================================
// SIGNED DOCUMENTS
// ==================================================
export const signedDocuments = pgTable("signed_documents", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id").references(() => applications.id),
  s3Key: varchar("s3_key", { length: 255 }),
  checksum: varchar("checksum", { length: 255 }),
  version: integer("version").default(1),
  accepted: boolean("accepted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export const insertSignedDocumentSchema = createInsertSchema(signedDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertSignedDocument = z.infer<typeof insertSignedDocumentSchema>;
export type SignedDocument = typeof signedDocuments.$inferSelect;

// ==================================================
// LENDER MATCH RESULTS
// ==================================================
export const lenderMatches = pgTable("lender_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id").references(() => applications.id),
  lenderProductId: uuid("lender_product_id").references(() => lenderProducts.id),
  matchScore: numeric("match_score", { precision: 5, scale: 2 }),
  sent: boolean("sent").default(false),
  sentAt: timestamp("sent_at"),
  accepted: boolean("accepted").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertLenderMatchSchema = createInsertSchema(lenderMatches).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertLenderMatch = z.infer<typeof insertLenderMatchSchema>;
export type LenderMatch = typeof lenderMatches.$inferSelect;

// ==================================================
// SYSTEM JOBS
// ==================================================
export const systemJobs = pgTable("system_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobType: varchar("job_type", { length: 255 }),
  status: varchar("status", { length: 50 }).default("pending"),
  attempt: integer("attempt").default(0),
  payload: jsonb("payload"),
  result: jsonb("result"),
  lastError: text("last_error"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertSystemJobSchema = createInsertSchema(systemJobs).omit({
  id: true,
  createdAt: true,
  startedAt: true,
  finishedAt: true,
} as const);
export type InsertSystemJob = z.infer<typeof insertSystemJobSchema>;
export type SystemJob = typeof systemJobs.$inferSelect;

// ==================================================
// SLA TRACKER
// ==================================================
export const slaTracker = pgTable("sla_tracker", {
  id: uuid("id").defaultRandom().primaryKey(),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: uuid("entity_id"),
  targetHours: integer("target_hours"),
  achieved: boolean("achieved").default(false),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertSlaTrackerSchema = createInsertSchema(slaTracker).omit({
  id: true,
  createdAt: true,
  closedAt: true,
} as const);
export type InsertSlaTracker = z.infer<typeof insertSlaTrackerSchema>;
export type SlaTracker = typeof slaTracker.$inferSelect;

// ==================================================
// ENDPOINT HEALTH LOGS
// ==================================================
export const endpointHealthLogs = pgTable("endpoint_health_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  endpoint: varchar("endpoint", { length: 255 }),
  status: varchar("status", { length: 50 }),
  responseTimeMs: integer("response_time_ms"),
  checkedAt: timestamp("checked_at").defaultNow(),
});
export const insertEndpointHealthLogSchema = createInsertSchema(endpointHealthLogs).omit({
  id: true,
  checkedAt: true,
} as const);
export type InsertEndpointHealthLog = z.infer<typeof insertEndpointHealthLogSchema>;
export type EndpointHealthLog = typeof endpointHealthLogs.$inferSelect;

// ==================================================
// FINAL EXPORTS
// ==================================================
export * from "./marketing-schema";

console.log("[SCHEMA] shared/schema.ts loaded successfully with no duplicate exports");
