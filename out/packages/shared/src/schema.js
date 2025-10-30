import { pgTable, text, varchar, timestamp, jsonb, index, uuid, integer, decimal, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
// Session storage table for Replit Auth
export const sessions = pgTable("sessions", {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
}, (table) => [index("IDX_session_expire").on(table.expire)]);
// Tenants table for multi-tenant support
export const tenants = pgTable("tenants", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    domain: varchar("domain", { length: 255 }).unique(),
    settings: jsonb("settings").default({}),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Users table for Replit Auth
export const users = pgTable("users", {
    id: varchar("id").primaryKey().notNull(), // Replit user ID
    email: varchar("email").unique(),
    firstName: varchar("first_name"),
    lastName: varchar("last_name"),
    profileImageUrl: varchar("profile_image_url"),
    role: varchar("role", {
        enum: ["client", "staff", "admin", "lender", "referrer"]
    }).notNull().default("client"),
    tenantId: uuid("tenant_id").references(() => tenants.id),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Business information
export const businesses = pgTable("businesses", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id").references(() => users.id).notNull(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    businessName: varchar("business_name", { length: 255 }).notNull(),
    businessType: varchar("business_type", { length: 100 }),
    industry: varchar("industry", { length: 100 }),
    yearEstablished: integer("year_established"),
    ein: varchar("ein", { length: 20 }),
    address: jsonb("address"), // Street, city, state, zip
    phone: varchar("phone", { length: 20 }),
    website: varchar("website", { length: 255 }),
    description: text("description"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Financial profiles
export const financialProfiles = pgTable("financial_profiles", {
    id: uuid("id").primaryKey().defaultRandom(),
    businessId: uuid("business_id").references(() => businesses.id).notNull(),
    annualRevenue: decimal("annual_revenue", { precision: 15, scale: 2 }),
    monthlyRevenue: decimal("monthly_revenue", { precision: 15, scale: 2 }),
    monthlyExpenses: decimal("monthly_expenses", { precision: 15, scale: 2 }),
    timeInBusiness: varchar("time_in_business", { length: 50 }),
    creditScore: integer("credit_score"),
    bankBalance: decimal("bank_balance", { precision: 15, scale: 2 }),
    monthlyDeposits: decimal("monthly_deposits", { precision: 15, scale: 2 }),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Loan products
export const loanProducts = pgTable("loan_products", {
    id: uuid("id").primaryKey().defaultRandom(),
    lenderId: uuid("lender_id").references(() => lenders.id),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    category: varchar("category", {
        enum: ["term_loan", "line_of_credit", "sba_loan", "equipment_loan", "merchant_cash_advance"]
    }).notNull(),
    minAmount: decimal("min_amount", { precision: 15, scale: 2 }),
    maxAmount: decimal("max_amount", { precision: 15, scale: 2 }),
    minCreditScore: integer("min_credit_score"),
    minTimeInBusiness: integer("min_time_in_business_months"),
    minAnnualRevenue: decimal("min_annual_revenue", { precision: 15, scale: 2 }),
    requiredDocuments: jsonb("required_documents"), // Array of document types
    terms: jsonb("terms"), // Interest rates, repayment terms, etc.
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Lenders
export const lenders = pgTable("lenders", {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    contactEmail: varchar("contact_email", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 20 }),
    website: varchar("website", { length: 255 }),
    apiEndpoint: varchar("api_endpoint", { length: 500 }),
    apiKey: text("api_key"),
    settings: jsonb("settings").default({}),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Applications
export const applications = pgTable("applications", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: varchar("user_id").references(() => users.id).notNull(),
    businessId: uuid("business_id").references(() => businesses.id).notNull(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    // loanProductId: uuid("loan_product_id").references(() => loanProducts.id), // REMOVED - Column doesn't exist in database
    requestedAmount: decimal("requested_amount", { precision: 15, scale: 2 }).notNull(),
    useOfFunds: text("use_of_funds"),
    status: varchar("status", {
        enum: ["draft", "submitted", "under_review", "lender_match", "approved", "declined", "funded"]
    }).default("draft"),
    currentStep: integer("current_step").default(1),
    formData: jsonb("form_data").default({}),
    // aiRecommendations: jsonb("ai_recommendations"), // REMOVED - Column doesn't exist in database
    // assignedStaff: varchar("assigned_staff").references(() => users.id), // REMOVED - Column doesn't exist in database
    submittedAt: timestamp("submitted_at"),
    reviewedAt: timestamp("reviewed_at"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
// Documents
export const documents = pgTable("documents", {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").references(() => applications.id).notNull(),
    userId: varchar("user_id").references(() => users.id).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 100 }),
    documentType: varchar("document_type", {
        enum: ["bank_statements", "tax_returns", "financial_statements", "business_license", "other"]
    }).notNull(),
    uploadPath: text("upload_path").notNull(),
    isProcessed: boolean("is_processed").default(false),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
});
// OCR Results
export const ocrResults = pgTable("ocr_results", {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").references(() => documents.id).notNull(),
    extractedFields: jsonb("extracted_fields").notNull(),
    confidence: decimal("confidence", { precision: 5, scale: 4 }),
    processingStatus: varchar("processing_status", {
        enum: ["pending", "processing", "completed", "failed"]
    }).default("pending"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at").defaultNow(),
});
// E-Signatures
export const signatures = pgTable("signatures", {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").references(() => applications.id).notNull(),
    userId: varchar("user_id").references(() => users.id).notNull(),
    documentUrl: text("document_url"),
    signatureUrl: text("signature_url"),
    status: varchar("status", {
        enum: ["pending", "signed", "declined", "expired"]
    }).default("pending"),
    signedAt: timestamp("signed_at"),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow(),
});
// Communication logs
export const communicationLogs = pgTable("communication_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").references(() => applications.id),
    userId: varchar("user_id").references(() => users.id),
    staffId: varchar("staff_id").references(() => users.id),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    type: varchar("type", {
        enum: ["email", "sms", "call", "note"]
    }).notNull(),
    direction: varchar("direction", {
        enum: ["inbound", "outbound"]
    }),
    subject: varchar("subject", { length: 255 }),
    content: text("content"),
    metadata: jsonb("metadata").default({}),
    createdAt: timestamp("created_at").defaultNow(),
});
// Pipeline stages
export const pipelineStages = pgTable("pipeline_stages", {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    order: integer("order").notNull(),
    color: varchar("color", { length: 7 }), // Hex color
    isDefault: boolean("is_default").default(false),
    createdAt: timestamp("created_at").defaultNow(),
});
// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
    users: many(users),
    businesses: many(businesses),
    loanProducts: many(loanProducts),
    lenders: many(lenders),
    applications: many(applications),
    communicationLogs: many(communicationLogs),
    pipelineStages: many(pipelineStages),
}));
export const usersRelations = relations(users, ({ one, many }) => ({
    tenant: one(tenants, {
        fields: [users.tenantId],
        references: [tenants.id],
    }),
    businesses: many(businesses),
    applications: many(applications),
    documents: many(documents),
    signatures: many(signatures),
    communicationLogs: many(communicationLogs),
    assignedApplications: many(applications, { relationName: "staffAssignments" }),
}));
export const businessesRelations = relations(businesses, ({ one, many }) => ({
    user: one(users, {
        fields: [businesses.userId],
        references: [users.id],
    }),
    tenant: one(tenants, {
        fields: [businesses.tenantId],
        references: [tenants.id],
    }),
    financialProfile: one(financialProfiles),
    applications: many(applications),
}));
export const financialProfilesRelations = relations(financialProfiles, ({ one }) => ({
    business: one(businesses, {
        fields: [financialProfiles.businessId],
        references: [businesses.id],
    }),
}));
export const applicationsRelations = relations(applications, ({ one, many }) => ({
    user: one(users, {
        fields: [applications.userId],
        references: [users.id],
    }),
    business: one(businesses, {
        fields: [applications.businessId],
        references: [businesses.id],
    }),
    tenant: one(tenants, {
        fields: [applications.tenantId],
        references: [tenants.id],
    }),
    // loanProduct: one(loanProducts, {
    //   fields: [applications.loanProductId],
    //   references: [loanProducts.id],
    // }),
    // assignedStaffMember: one(users, {
    //   fields: [applications.assignedStaff],
    //   references: [users.id],
    //   relationName: "staffAssignments",
    // }),
    documents: many(documents),
    signatures: many(signatures),
    communicationLogs: many(communicationLogs),
}));
export const documentsRelations = relations(documents, ({ one, many }) => ({
    application: one(applications, {
        fields: [documents.applicationId],
        references: [applications.id],
    }),
    user: one(users, {
        fields: [documents.userId],
        references: [users.id],
    }),
    ocrResults: many(ocrResults),
}));
// Banking Analysis results - schema matched to actual database structure
export const bankingAnalysis = pgTable("banking_analysis", {
    id: uuid("id").primaryKey().defaultRandom(),
    applicationId: uuid("application_id").references(() => applications.id).notNull(),
    documentId: uuid("document_id").references(() => documents.id).notNull(),
    bankName: varchar("bank_name", { length: 255 }),
    accountNumber: varchar("account_number", { length: 100 }),
    accountType: varchar("account_type", { length: 50 }),
    statementPeriod: jsonb("statement_period"),
    openingBalance: decimal("opening_balance", { precision: 15, scale: 2 }),
    closingBalance: decimal("closing_balance", { precision: 15, scale: 2 }),
    averageDailyBalance: decimal("average_daily_balance", { precision: 15, scale: 2 }),
    minimumBalance: decimal("minimum_balance", { precision: 15, scale: 2 }),
    maximumBalance: decimal("maximum_balance", { precision: 15, scale: 2 }),
    totalDeposits: decimal("total_deposits", { precision: 15, scale: 2 }),
    totalWithdrawals: decimal("total_withdrawals", { precision: 15, scale: 2 }),
    totalChecks: decimal("total_checks", { precision: 15, scale: 2 }),
    totalFees: decimal("total_fees", { precision: 15, scale: 2 }),
    transactionCount: integer("transaction_count"),
    depositCount: integer("deposit_count"),
    withdrawalCount: integer("withdrawal_count"),
    netCashFlow: decimal("net_cash_flow", { precision: 15, scale: 2 }),
    averageMonthlyInflow: decimal("average_monthly_inflow", { precision: 15, scale: 2 }),
    averageMonthlyOutflow: decimal("average_monthly_outflow", { precision: 15, scale: 2 }),
    cashFlowTrend: varchar("cash_flow_trend", { length: 50 }),
    volatilityScore: decimal("volatility_score", { precision: 5, scale: 4 }),
    nsfCount: integer("nsf_count"),
    nsfFees: decimal("nsf_fees", { precision: 15, scale: 2 }),
    overdraftDays: integer("overdraft_days"),
    insufficientFundsRisk: varchar("insufficient_funds_risk", { length: 20 }),
    businessDeposits: decimal("business_deposits", { precision: 15, scale: 2 }),
    personalWithdrawals: decimal("personal_withdrawals", { precision: 15, scale: 2 }),
    operatingExpenses: decimal("operating_expenses", { precision: 15, scale: 2 }),
    merchantFees: decimal("merchant_fees", { precision: 15, scale: 2 }),
    employeePayments: decimal("employee_payments", { precision: 15, scale: 2 }),
    recurringWithdrawals: jsonb("recurring_withdrawals"),
    largeDeposits: jsonb("large_deposits"),
    unusualActivity: jsonb("unusual_activity"),
    transactionPatterns: jsonb("transaction_patterns"),
    riskFactors: jsonb("risk_factors"),
    financialHealthScore: integer("financial_health_score"),
    recommendations: text("recommendations").array(),
    confidenceLevel: varchar("confidence_level", { length: 10 }),
    analysisVersion: varchar("analysis_version", { length: 50 }),
    processingTime: integer("processing_time"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
export const ocrResultsRelations = relations(ocrResults, ({ one }) => ({
    document: one(documents, {
        fields: [ocrResults.documentId],
        references: [documents.id],
    }),
}));
export const bankingAnalysisRelations = relations(bankingAnalysis, ({ one }) => ({
    application: one(applications, {
        fields: [bankingAnalysis.applicationId],
        references: [applications.id],
    }),
    document: one(documents, {
        fields: [bankingAnalysis.documentId],
        references: [documents.id],
    }),
}));
// Zod schemas
export const insertTenantSchema = createInsertSchema(tenants);
export const selectTenantSchema = createSelectSchema(tenants);
export const upsertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertBusinessSchema = createInsertSchema(businesses);
export const selectBusinessSchema = createSelectSchema(businesses);
export const insertFinancialProfileSchema = createInsertSchema(financialProfiles);
export const selectFinancialProfileSchema = createSelectSchema(financialProfiles);
export const insertApplicationSchema = createInsertSchema(applications);
export const selectApplicationSchema = createSelectSchema(applications);
export const insertDocumentSchema = createInsertSchema(documents);
export const selectDocumentSchema = createSelectSchema(documents);
export const insertSignatureSchema = createInsertSchema(signatures);
export const selectSignatureSchema = createSelectSchema(signatures);
export const insertCommunicationLogSchema = createInsertSchema(communicationLogs);
export const selectCommunicationLogSchema = createSelectSchema(communicationLogs);
export const insertBankingAnalysisSchema = createInsertSchema(bankingAnalysis);
export const selectBankingAnalysisSchema = createSelectSchema(bankingAnalysis);
