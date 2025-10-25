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
// TASKS
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
// API TRANSMISSIONS
// ==================================================
export const transmissions = pgTable("transmissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  endpoint: varchar("endpoint", { length: 255 }),
  payload: jsonb("payload"),
  status: varchar("status", { length: 50 }),
  response: jsonb("response"),
  retries: integer("retries").default(0),
  lastTriedAt: timestamp("last_tried_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertTransmissionSchema = createInsertSchema(transmissions).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertTransmission = z.infer<typeof insertTransmissionSchema>;
export type Transmission = typeof transmissions.$inferSelect;

// ==================================================
// HEALTH CHECKS
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
// RETRY QUEUE
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
// AUDIT LOGS (SYSTEM-WIDE)
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
// CHAT ESCALATION LOGS
// ==================================================
export const chatEscalations = pgTable("chat_escalations", {
  id: uuid("id").defaultRandom().primaryKey(),
  contactId: uuid("contact_id").references(() => contacts.id),
  reason: text("reason"),
  escalatedBy: uuid("escalated_by").references(() => users.id),
  resolved: boolean("resolved").default(false),
  resolvedBy: uuid("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertChatEscalationSchema = createInsertSchema(chatEscalations).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertChatEscalation = z.infer<typeof insertChatEscalationSchema>;
export type ChatEscalation = typeof chatEscalations.$inferSelect;

// ==================================================
// DOCUMENT VERSION HISTORY
// ==================================================
export const documentVersions = pgTable("document_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id),
  versionNumber: integer("version_number"),
  s3Key: varchar("s3_key", { length: 255 }),
  checksum: varchar("checksum", { length: 255 }),
  uploadedBy: uuid("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
});
export const insertDocumentVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  uploadedAt: true,
} as const);
export type InsertDocumentVersion = z.infer<typeof insertDocumentVersionSchema>;
export type DocumentVersion = typeof documentVersions.$inferSelect;

// ==================================================
// AI RISK SCORES
// ==================================================
export const aiRiskScores = pgTable("ai_risk_scores", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id").references(() => applications.id),
  score: numeric("score", { precision: 5, scale: 2 }),
  rationale: text("rationale"),
  flagged: boolean("flagged").default(false),
  generatedAt: timestamp("generated_at").defaultNow(),
});
export const insertAiRiskScoreSchema = createInsertSchema(aiRiskScores).omit({
  id: true,
  generatedAt: true,
} as const);
export type InsertAiRiskScore = z.infer<typeof insertAiRiskScoreSchema>;
export type AiRiskScore = typeof aiRiskScores.$inferSelect;

// ==================================================
// PUSH NOTIFICATIONS
// ==================================================
export const pushNotifications = pgTable("push_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  title: varchar("title", { length: 255 }),
  message: text("message"),
  sentAt: timestamp("sent_at").defaultNow(),
  read: boolean("read").default(false),
});
export const insertPushNotificationSchema = createInsertSchema(pushNotifications).omit({
  id: true,
  sentAt: true,
} as const);
export type InsertPushNotification = z.infer<typeof insertPushNotificationSchema>;
export type PushNotification = typeof pushNotifications.$inferSelect;
// ==================================================
// TASKS
// ==================================================
export const tasks = pgTable("tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  assignedTo: uuid("assigned_to").references(() => users.id),
  dueDate: timestamp("due_date"),
  completed: boolean("completed").default(false),
  completedAt: timestamp("completed_at"),
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
// CALENDAR EVENTS
// ==================================================
export const calendarEvents = pgTable("calendar_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  title: varchar("title", { length: 255 }),
  location: varchar("location", { length: 255 }),
  startTime: timestamp("start_time"),
  endTime: timestamp("end_time"),
  description: text("description"),
  provider: varchar("provider", { length: 50 }),
  externalId: varchar("external_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;
export type CalendarEvent = typeof calendarEvents.$inferSelect;

// ==================================================
// GOOGLE ADS SYNC
// ==================================================
export const googleAdsSync = pgTable("google_ads_sync", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  campaignId: varchar("campaign_id", { length: 255 }),
  status: varchar("status", { length: 100 }),
  spend: numeric("spend", { precision: 12, scale: 2 }),
  conversions: integer("conversions"),
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
});
export const insertGoogleAdsSyncSchema = createInsertSchema(googleAdsSync).omit({
  id: true,
  lastSyncAt: true,
} as const);
export type InsertGoogleAdsSync = z.infer<typeof insertGoogleAdsSyncSchema>;
export type GoogleAdsSync = typeof googleAdsSync.$inferSelect;

// ==================================================
// LINKEDIN CAMPAIGNS
// ==================================================
export const linkedinCampaigns = pgTable("linkedin_campaigns", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }),
  sequence: jsonb("sequence"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertLinkedinCampaignSchema = createInsertSchema(linkedinCampaigns).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertLinkedinCampaign = z.infer<typeof insertLinkedinCampaignSchema>;
export type LinkedinCampaign = typeof linkedinCampaigns.$inferSelect;

// ==================================================
// CONNECTED ACCOUNTS
// ==================================================
export const connectedAccounts = pgTable("connected_accounts", {
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
export const insertConnectedAccountSchema = createInsertSchema(connectedAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as const);
export type InsertConnectedAccount = z.infer<typeof insertConnectedAccountSchema>;
export type ConnectedAccount = typeof connectedAccounts.$inferSelect;

// ==================================================
// API TOKENS
// ==================================================
export const apiTokens = pgTable("api_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  name: varchar("name", { length: 255 }),
  token: varchar("token", { length: 255 }),
  scopes: text("scopes"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertApiTokenSchema = createInsertSchema(apiTokens).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertApiToken = z.infer<typeof insertApiTokenSchema>;
export type ApiToken = typeof apiTokens.$inferSelect;
// ==================================================
// REFERRER ANALYTICS
// ==================================================
export const referrerAnalytics = pgTable("referrer_analytics", {
  id: uuid("id").defaultRandom().primaryKey(),
  referrerId: uuid("referrer_id").references(() => referrers.id),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  applications: integer("applications").default(0),
  funded: integer("funded").default(0),
  conversionRate: numeric("conversion_rate", { precision: 5, scale: 2 }),
  reportMonth: varchar("report_month", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertReferrerAnalyticsSchema = createInsertSchema(referrerAnalytics).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertReferrerAnalytics = z.infer<typeof insertReferrerAnalyticsSchema>;
export type ReferrerAnalytics = typeof referrerAnalytics.$inferSelect;

// ==================================================
// AI FRAUD FLAGS
// ==================================================
export const aiFraudFlags = pgTable("ai_fraud_flags", {
  id: uuid("id").defaultRandom().primaryKey(),
  applicationId: uuid("application_id").references(() => applications.id),
  field: varchar("field", { length: 255 }),
  reason: text("reason"),
  severity: varchar("severity", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertAiFraudFlagSchema = createInsertSchema(aiFraudFlags).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertAiFraudFlag = z.infer<typeof insertAiFraudFlagSchema>;
export type AiFraudFlag = typeof aiFraudFlags.$inferSelect;

// ==================================================
// SYSTEM BACKUPS
// ==================================================
export const systemBackups = pgTable("system_backups", {
  id: uuid("id").defaultRandom().primaryKey(),
  backupType: varchar("backup_type", { length: 50 }),
  s3Key: varchar("s3_key", { length: 255 }),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  sizeMb: numeric("size_mb", { precision: 10, scale: 2 }),
  checksum: varchar("checksum", { length: 255 }),
});
export const insertSystemBackupSchema = createInsertSchema(systemBackups).omit({
  id: true,
  startedAt: true,
  completedAt: true,
} as const);
export type InsertSystemBackup = z.infer<typeof insertSystemBackupSchema>;
export type SystemBackup = typeof systemBackups.$inferSelect;

// ==================================================
// APPLICATION METRICS
// ==================================================
export const appMetrics = pgTable("app_metrics", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 255 }),
  value: numeric("value", { precision: 10, scale: 2 }),
  recordedAt: timestamp("recorded_at").defaultNow(),
});
export const insertAppMetricSchema = createInsertSchema(appMetrics).omit({
  id: true,
  recordedAt: true,
} as const);
export type InsertAppMetric = z.infer<typeof insertAppMetricSchema>;
export type AppMetric = typeof appMetrics.$inferSelect;

// ==================================================
// ERROR LOGS
// ==================================================
export const errorLogs = pgTable("error_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  level: varchar("level", { length: 50 }),
  message: text("message"),
  stack: text("stack"),
  context: jsonb("context"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;
export type ErrorLog = typeof errorLogs.$inferSelect;

// ==================================================
// TRANSACTION LOGS
// ==================================================
export const transactionLogs = pgTable("transaction_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: varchar("action", { length: 255 }),
  entityType: varchar("entity_type", { length: 100 }),
  entityId: uuid("entity_id"),
  before: jsonb("before"),
  after: jsonb("after"),
  userId: uuid("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertTransactionLogSchema = createInsertSchema(transactionLogs).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertTransactionLog = z.infer<typeof insertTransactionLogSchema>;
export type TransactionLog = typeof transactionLogs.$inferSelect;

// ==================================================
// DOCUMENT RECOVERY LOGS
// ==================================================
export const documentRecoveryLogs = pgTable("document_recovery_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  documentId: uuid("document_id").references(() => documents.id),
  userId: uuid("user_id").references(() => users.id),
  reason: text("reason"),
  restored: boolean("restored").default(false),
  restoredAt: timestamp("restored_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertDocumentRecoveryLogSchema = createInsertSchema(documentRecoveryLogs).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertDocumentRecoveryLog = z.infer<typeof insertDocumentRecoveryLogSchema>;
export type DocumentRecoveryLog = typeof documentRecoveryLogs.$inferSelect;
// ==================================================
// SYSTEM ALERTS
// ==================================================
export const systemAlerts = pgTable("system_alerts", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: varchar("category", { length: 100 }),
  message: text("message").notNull(),
  severity: varchar("severity", { length: 20 }).default("info"),
  acknowledged: boolean("acknowledged").default(false),
  acknowledgedBy: uuid("acknowledged_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertSystemAlertSchema = createInsertSchema(systemAlerts).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertSystemAlert = z.infer<typeof insertSystemAlertSchema>;
export type SystemAlert = typeof systemAlerts.$inferSelect;

// ==================================================
// WEBHOOK DELIVERY LOGS
// ==================================================
export const webhookDeliveryLogs = pgTable("webhook_delivery_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  subscriptionId: uuid("subscription_id").references(() => webhookSubscriptions.id),
  statusCode: integer("status_code"),
  success: boolean("success").default(false),
  responseTimeMs: integer("response_time_ms"),
  responseBody: text("response_body"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertWebhookDeliveryLogSchema = createInsertSchema(webhookDeliveryLogs).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertWebhookDeliveryLog = z.infer<typeof insertWebhookDeliveryLogSchema>;
export type WebhookDeliveryLog = typeof webhookDeliveryLogs.$inferSelect;

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
// API HEALTH CHECKS
// ==================================================
export const apiHealthChecks = pgTable("api_health_checks", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }),
  status: varchar("status", { length: 50 }).default("unknown"),
  responseTimeMs: integer("response_time_ms"),
  checkedAt: timestamp("checked_at").defaultNow(),
});
export const insertApiHealthCheckSchema = createInsertSchema(apiHealthChecks).omit({
  id: true,
  checkedAt: true,
} as const);
export type InsertApiHealthCheck = z.infer<typeof insertApiHealthCheckSchema>;
export type ApiHealthCheck = typeof apiHealthChecks.$inferSelect;

// ==================================================
// RETRY QUEUE
// ==================================================
export const retryQueue = pgTable("retry_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  jobType: varchar("job_type", { length: 100 }),
  payload: jsonb("payload"),
  retries: integer("retries").default(0),
  maxRetries: integer("max_retries").default(5),
  lastError: text("last_error"),
  scheduledAt: timestamp("scheduled_at").defaultNow(),
  executedAt: timestamp("executed_at"),
  completed: boolean("completed").default(false),
});
export const insertRetryQueueSchema = createInsertSchema(retryQueue).omit({
  id: true,
  executedAt: true,
} as const);
export type InsertRetryQueue = z.infer<typeof insertRetryQueueSchema>;
export type RetryQueue = typeof retryQueue.$inferSelect;

// ==================================================
// TRANSMISSION LOGS
// ==================================================
export const transmissionLogs = pgTable("transmission_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  destination: varchar("destination", { length: 255 }),
  requestPayload: jsonb("request_payload"),
  responsePayload: jsonb("response_payload"),
  statusCode: integer("status_code"),
  success: boolean("success").default(false),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow(),
});
export const insertTransmissionLogSchema = createInsertSchema(transmissionLogs).omit({
  id: true,
  createdAt: true,
} as const);
export type InsertTransmissionLog = z.infer<typeof insertTransmissionLogSchema>;
export type TransmissionLog = typeof transmissionLogs.$inferSelect;

// ==================================================
// LENDER REPORTS
// ==================================================
export const lenderReports = pgTable("lender_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  lenderId: uuid("lender_id").references(() => lenders.id),
  reportDate: timestamp("report_date").defaultNow(),
  totalApplications: integer("total_applications").default(0),
  fundedCount: integer("funded_count").default(0),
  declinedCount: integer("declined_count").default(0),
  totalAmountFunded: numeric("total_amount_funded", { precision: 12, scale: 2 }),
});
export const insertLenderReportSchema = createInsertSchema(lenderReports).omit({
  id: true,
  reportDate: true,
} as const);
export type InsertLenderReport = z.infer<typeof insertLenderReportSchema>;
export type LenderReport = typeof lenderReports.$inferSelect;
// ==================================================
// MARKETING REPORTS
// ==================================================
export const marketingReports = pgTable("marketing_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  campaignName: varchar("campaign_name", { length: 255 }),
  impressions: integer("impressions").default(0),
  clicks: integer("clicks").default(0),
  conversions: integer("conversions").default(0),
  spend: numeric("spend", { precision: 12, scale: 2 }),
  roi: numeric("roi", { precision: 6, scale: 2 }),
  reportDate: timestamp("report_date").defaultNow(),
});
export const insertMarketingReportSchema = createInsertSchema(marketingReports).omit({
  id: true,
  reportDate: true,
} as const);
export type InsertMarketingReport = z.infer<typeof insertMarketingReportSchema>;
export type MarketingReport = typeof marketingReports.$inferSelect;

// ==================================================
// FEATURE USAGE
// ==================================================
export const featureUsage = pgTable("feature_usage", {
  id: uuid("id").defaultRandom().primaryKey(),
  featureName: varchar("feature_name", { length: 255 }),
  userId: uuid("user_id").references(() => users.id),
  count: integer("count").default(0),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
});
export const insertFeatureUsageSchema = createInsertSchema(featureUsage).omit({
  id: true,
  lastUsedAt: true,
} as const);
export type InsertFeatureUsage = z.infer<typeof insertFeatureUsageSchema>;
export type FeatureUsage = typeof featureUsage.$inferSelect;

// ==================================================
// PUSH NOTIFICATIONS
// ==================================================
export const pushNotifications = pgTable("push_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  title: varchar("title", { length: 255 }),
  body: text("body"),
  sentAt: timestamp("sent_at").defaultNow(),
  read: boolean("read").default(false),
});
export const insertPushNotificationSchema = createInsertSchema(pushNotifications).omit({
  id: true,
  sentAt: true,
} as const);
export type InsertPushNotification = z.infer<typeof insertPushNotificationSchema>;
export type PushNotification = typeof pushNotifications.$inferSelect;

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
// EXPORT MARKETING SCHEMA MODULES
// ==================================================
export * from "./marketing-schema";

console.log("[SCHEMA] shared/schema.ts fully loaded with backend parity tables and insert schemas");
