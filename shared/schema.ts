import { pgTable, uuid, text, integer, timestamp, boolean, varchar, jsonb, pgEnum, decimal, real } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { DOCUMENT_TYPES } from './documentTypes';

// Import enum lock validation
import { validateEnumModification } from '../server/db/schema/documentLock';

// Validate enum modification before definition
validateEnumModification('document_type');

// Create enums for status fields
export const documentTypeEnum = pgEnum('document_type', DOCUMENT_TYPES);

export const statusEnum = pgEnum('status', [
  'pending',
  'processing', 
  'completed',
  'failed'
]);

// Lead source and role enums for Partner Referral System
export const leadSourceEnum = pgEnum('lead_source', [
  'application',
  'partner_referral',
  'direct_call',
  'web_inquiry',
  'manual_entry'
]);

// Device platform enum for multi-platform push notifications
export const devicePlatformEnum = pgEnum('device_platform', [
  'webpush',
  'fcm',
  'apns',
  'windows'
]);

// Silo enum for business unit targeting
export const siloEnum = pgEnum('silo', [
  'bf',
  'slf'
]);

export const userRoleEnum = pgEnum('user_role', [
  'admin',
  'staff', 
  'marketing',
  'lender',
  'referrer'
]);

// OAuth Provider enum for Connected Accounts
export const oauthProviderEnum = pgEnum('oauth_provider', [
  'microsoft',
  'google', 
  'linkedin',
  'twitter',
  'facebook'
]);

export const approvalStatusEnum = pgEnum('approval_status', [
  'queued',
  'approved',
  'rejected',
  'held',
  'sent',
  'error',
  'expired'
]);

export const approvalChannelEnum = pgEnum('approval_channel', [
  'sms',
  'email',
  'linkedin',
  'task',
  'other'
]);

export const approvalActionEnum = pgEnum('approval_action', [
  'send_message',
  'create_task',
  'other'
]);

export const backupStatusEnum = pgEnum('backup_status', [
  'pending',
  'completed',
  'failed'
]);

// Authoritative lender product enums
export const lenderCountryEnum = pgEnum('lender_country', [
  'US',
  'CA'
]);

export const lenderCategoryEnum = pgEnum('lender_category', [
  'line_of_credit',
  'term_loan',
  'equipment_financing', 
  'invoice_factoring',
  'purchase_order_financing',
  'Business Line of Credit',
  'Term Loan',
  'Equipment Financing',
  'Invoice Factoring',
  'Purchase Order Financing',
  'Working Capital',
  'Asset-Based Lending',
  'SBA Loan'
]);

// Main tables
export const silos = pgTable('silos', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: varchar('code', { length: 10 }).notNull().unique(),
  name: varchar('name', { length: 100 }).notNull(),
  color: varchar('color', { length: 20 }).notNull(),
  logoUrl: varchar('logo_url', { length: 500 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  mobilePhone: varchar('mobile_phone', { length: 20 }).notNull(), // Required for SMS 2FA
  role: userRoleEnum('role').notNull().default('staff'),
  department: varchar('department', { length: 100 }), // Optional but useful for filtering
  is2FAEnabled: boolean('is_2fa_enabled').default(true), // Auto-enabled if mobile phone present
  isActive: boolean('is_active').notNull().default(true),
  profileImageUrl: varchar('profile_image_url', { length: 500 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  
  // Legacy/Extended fields maintained for compatibility
  phone: text('phone'), // Made nullable for backward compatibility
  tenantId: uuid('tenant_id'),
  otpCode: text('otp_code'),
  otpExpires: timestamp('otp_expires'),
  username: varchar('username', { length: 100 }),
  isEmailVerified: boolean('is_email_verified').default(false),
  isPhoneVerified: boolean('is_phone_verified').default(false),
  lastLogin: timestamp('last_login'),
  passwordResetToken: text('password_reset_token'),
  passwordResetExpiresAt: timestamp('password_reset_expires_at'),
  emailVerificationToken: varchar('email_verification_token', { length: 255 }),
  emailVerificationExpires: timestamp('email_verification_expires'),
  preferences: jsonb('preferences'),
  metadata: jsonb('metadata'),
  lenderId: uuid('lender_id'),
  passwordIsTemporary: boolean('password_is_temporary').default(false),
  webauthnCredentials: jsonb('webauthn_credentials'),
  pushSubscription: jsonb('push_subscription'),
  otpVerified: boolean('otp_verified').default(false),
  mfaEnabled: boolean('mfa_enabled').default(true),
  totpSecret: text('totp_secret'),
  totpEnabled: boolean('totp_enabled').default(false),
  roles: text('roles').array(),
  phoneE164: text('phone_e164'),
  accessBf: boolean('access_bf').default(false),
  accessSlf: boolean('access_slf').default(false)
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow()
});

// Device Registrations table for multi-platform push notifications
export const deviceRegistrations = pgTable('device_registrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  platform: devicePlatformEnum('platform').notNull(),
  token: text('token').notNull(),
  silo: siloEnum('silo').notNull().default('bf'),
  userAgent: text('user_agent'),
  deviceInfo: jsonb('device_info'),
  isActive: boolean('is_active').notNull().default(true),
  lastUsed: timestamp('last_used', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  // Ensure unique platform-token combinations
  uniquePlatformToken: {name: 'unique_platform_token', columns: [table.platform, table.token]},
  // Index for fast user lookups
  userIdIndex: {name: 'device_registrations_user_id_idx', columns: [table.userId]},
  // Index for silo-based targeting
  siloIndex: {name: 'device_registrations_silo_idx', columns: [table.silo]}
}));

// CLEAN APPLICATIONS SCHEMA - Only columns that exist in actual database
export const applications: any = pgTable('applications', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: varchar('user_id'),
  business_id: uuid('business_id'),
  tenant_id: uuid('tenant_id'),
  status: varchar('status'),
  requested_amount: decimal('requested_amount'),
  use_of_funds: text('use_of_funds'),
  current_step: integer('current_step'),
  form_data: jsonb('form_data'),
  submitted_at: timestamp('submitted_at'),
  reviewed_at: timestamp('reviewed_at'),
  reviewed_by: varchar('reviewed_by'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
  signed: boolean('signed'),
  signed_at: timestamp('signed_at'),
  sign_url: varchar('sign_url'),
  banking_analysis: jsonb('banking_analysis'),
  financials_ocr: jsonb('financials_ocr'),
  document_approvals: jsonb('document_approvals'),
  product_category: varchar('product_category'),
  recommended_lender_id: varchar('recommended_lender_id'),
  missing_docs: boolean('missing_docs'),
  loan_category: varchar('loan_category'),
  legal_business_name: varchar('legal_business_name'),
  dba_name: varchar('dba_name'),
  business_type: varchar('business_type'),
  business_email: varchar('business_email'),
  business_phone: varchar('business_phone'),
  business_address: text('business_address'),
  contact_first_name: varchar('contact_first_name'),
  contact_last_name: varchar('contact_last_name'),
  contact_email: varchar('contact_email'),
  contact_phone: varchar('contact_phone'),
  owner_first_name: varchar('owner_first_name'),
  owner_last_name: varchar('owner_last_name'),
  owner_ssn: varchar('owner_ssn'),
  ownership_percentage: decimal('ownership_percentage'),
  loan_amount: decimal('loan_amount'),
  repayment_terms: varchar('repayment_terms'),
  number_of_employees: integer('number_of_employees'),
  annual_revenue: decimal('annual_revenue'),
  years_in_business: integer('years_in_business'),
  signing_status: varchar('signing_status'),
  legacy_id: varchar('legacy_id'),
  signed_pdf_document_id: uuid('signed_pdf_document_id'),
  is_ready_for_lenders: boolean('is_ready_for_lenders'),
  business_entity_type: varchar('business_entity_type'),
  stage: varchar('stage', { length: 50 }).default('new'),
  contact_id: uuid('contact_id'),
  utm_source: text('utm_source'),
  utm_medium: text('utm_medium'),
  utm_campaign: text('utm_campaign'),
  gclid: text('gclid'),
  ad_platform: text('ad_platform'),
  ad_campaign_id: text('ad_campaign_id'),
  ad_group_id: text('ad_group_id'),
  ad_id: text('ad_id'),
  funded: boolean('funded'),
  business_name: varchar('business_name'),
  external_id: text('external_id'),
  fields_raw: jsonb('fields_raw'),
  fields_canonical: jsonb('fields_canonical'),
  fields_unmapped: jsonb('fields_unmapped'),
  fields_coverage: decimal('fields_coverage'),
  last_mapped_at: timestamp('last_mapped_at', { withTimezone: true }),
  gbraid: text('gbraid'),
  wbraid: text('wbraid'),
  ad_click_time: timestamp('ad_click_time', { withTimezone: true }),
  product_id: text('product_id'),
  submission_country: text('submission_country'),
  product_snapshot: jsonb('product_snapshot'),
  required_documents: text('required_documents').array(),
  application_canon: jsonb('application_canon'),
  application_canon_version: varchar('application_canon_version', { length: 16 }),
  application_field_count: integer('application_field_count'),
  application_canon_hash: varchar('application_canon_hash', { length: 64 })
});

export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessName: varchar('business_name', { length: 255 }).notNull(),
  legalBusinessName: varchar('legal_business_name', { length: 255 }),
  businessType: varchar('business_type', { length: 100 }),
  industry: varchar('industry', { length: 100 }),
  yearEstablished: integer('year_established'),
  employeeCount: integer('employee_count'),
  annualRevenue: integer('annual_revenue'),
  businessAddress: text('business_address'),
  businessPhone: varchar('business_phone', { length: 20 }),
  businessEmail: varchar('business_email', { length: 255 }),
  website: varchar('website', { length: 255 }),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileType: varchar('file_type', { length: 100 }),
  fileSize: integer('file_size'),
  documentType: documentTypeEnum('document_type').notNull(),
  filePath: varchar('file_path', { length: 500 }),
  uploadedBy: varchar('uploaded_by', { length: 255 }),
  isRequired: boolean('is_required').default(false),
  isVerified: boolean('is_verified').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  status: statusEnum('status').default('pending'),
  rejectionReason: text('rejection_reason'),
  verifiedAt: timestamp('verified_at'),
  reviewedBy: uuid('reviewed_by'),
  updatedAt: timestamp('updated_at').defaultNow(),
  storageKey: varchar('storage_key', { length: 500 }),
  checksum: varchar('checksum', { length: 255 }),
  tags: text('tags').array(),
  description: text('description'),
  sha256: varchar('sha256', { length: 64 }),
  versionNumber: integer('version_number').default(1),
  previewStatus: varchar('preview_status', { length: 50 }),
  fileExists: boolean('file_exists').default(true),
  mimeType: varchar('mime_type', { length: 100 }),
  sha256Checksum: varchar('sha256_checksum', { length: 64 }),
  backupStatus: backupStatusEnum('backup_status').default('pending'),
  objectStorageKey: varchar('object_storage_key', { length: 500 }),
  storageStatus: varchar('storage_status', { length: 50 })
});



export const expectedDocuments = pgTable('expected_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id),
  documentType: documentTypeEnum('document_type').notNull(),
  isRequired: boolean('is_required').default(true),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow()
});

// NEW: Retry upload logs table for strict audit trail
export const retryUploadLogs = pgTable('retry_upload_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  documentType: documentTypeEnum('document_type').notNull(),
  errorMessage: text('error_message').notNull(),
  attempt: integer('attempt').notNull(),
  retryScheduledAt: timestamp('retry_scheduled_at'),
  retryCompletedAt: timestamp('retry_completed_at'),
  retrySuccess: boolean('retry_success'),
  finalErrorMessage: text('final_error_message'),
  createdAt: timestamp('created_at').defaultNow()
});

// Application deletion log table (already created)
export const applicationDeletionLog = pgTable('application_deletion_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull(),
  userId: uuid('user_id').references(() => users.id),
  userEmail: varchar('user_email', { length: 255 }),
  source: varchar('source', { length: 50 }).notNull(),
  deletionReason: text('deletion_reason'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  deletedAt: timestamp('deleted_at').notNull(),
  applicationData: jsonb('application_data'),
  createdAt: timestamp('created_at').defaultNow()
});

// Document upload log table (already exists)
export const documentUploadLog = pgTable('document_upload_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id'),
  applicationId: uuid('application_id'),
  fileName: varchar('file_name', { length: 255 }),
  uploadAttemptedAt: timestamp('upload_attempted_at'),
  diskWriteSuccessful: boolean('disk_write_successful'),
  s3BackupSuccessful: boolean('s3_backup_successful'),
  checksumVerified: boolean('checksum_verified'),
  errorMessage: text('error_message'),
  recoveryAttemptedAt: timestamp('recovery_attempted_at'),
  createdAt: timestamp('created_at').defaultNow()
});

// Insert schemas - User schemas moved to production section below

// Device registrations schemas
export const insertDeviceRegistrationSchema = createInsertSchema(deviceRegistrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastUsed: true
} as any);



export const insertApplicationSchema = createInsertSchema(applications).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertBusinessSchema = createInsertSchema(businesses).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertRetryUploadLogSchema = createInsertSchema(retryUploadLogs).omit({
  id: true,
  createdAt: true
} as any);

// Email Messages table
export const emailMessages = pgTable('email_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: integer('account_id'),
  messageId: text('message_id').unique(),
  threadId: text('thread_id'),
  subject: text('subject'),
  fromAddress: text('from_address'),
  toAddresses: text('to_addresses').array(),
  ccAddresses: text('cc_addresses').array(),
  bccAddresses: text('bcc_addresses').array(),
  replyTo: text('reply_to'),
  body: text('body'),
  bodyHtml: text('body_html'),
  bodyText: text('body_text'),
  messageDate: timestamp('message_date'),
  isRead: boolean('is_read').default(false),
  isStarred: boolean('is_starred').default(false),
  isSent: boolean('is_sent').default(false),
  isDraft: boolean('is_draft').default(false),
  isDeleted: boolean('is_deleted').default(false),
  hasAttachments: boolean('has_attachments').default(false),
  attachmentCount: integer('attachment_count').default(0),
  attachmentData: jsonb('attachment_data'),
  contactId: integer('contact_id'),
  applicationId: text('application_id'),
  category: text('category'),
  priority: text('priority'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const insertEmailMessageSchema = createInsertSchema(emailMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

// New tables for Staff Application Full Upgrade

// Scheduled Notifications table
export const scheduledNotifications = pgTable('scheduled_notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').references(() => applications.id),
  type: varchar('type', { length: 100 }).notNull(),
  payload: jsonb('payload').notNull(),
  scheduledAt: timestamp('scheduled_at').notNull(),
  sent: boolean('sent').default(false),
  sentAt: timestamp('sent_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Document Backups table for audit snapshots
export const documentBackups = pgTable('document_backups', {
  id: uuid('id').primaryKey().defaultRandom(),
  backupDate: timestamp('backup_date').notNull(),
  documentsCount: integer('documents_count').notNull(),
  backupSizeMb: integer('backup_size_mb'),
  s3Location: varchar('s3_location', { length: 500 }),
  checksumSha256: varchar('checksum_sha256', { length: 64 }),
  status: backupStatusEnum('status').default('pending'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at')
});

// Enhanced documents table with confidence scores and risk scoring
export const documentAnalysis = pgTable('document_analysis', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').references(() => documents.id),
  ocrResults: jsonb('ocr_results'),
  confidenceScores: jsonb('confidence_scores'),
  riskScore: integer('risk_score'),
  fieldMismatches: jsonb('field_mismatches'),
  extractedFields: jsonb('extracted_fields'),
  analysisVersion: varchar('analysis_version', { length: 20 }).default('1.0'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Chat Transcripts table
export const chatTranscripts = pgTable('chat_transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  applicationId: uuid('application_id').references(() => applications.id),
  userId: uuid('user_id').references(() => users.id),
  messages: jsonb('messages').notNull(),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
  escalationId: uuid('escalation_id').references(() => chatEscalations.id),
  createdAt: timestamp('created_at').defaultNow()
});

// Insert schemas for new tables
export const insertScheduledNotificationSchema = createInsertSchema(scheduledNotifications).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertDocumentBackupSchema = createInsertSchema(documentBackups).omit({
  id: true,
  createdAt: true
} as any);

export const insertDocumentAnalysisSchema = createInsertSchema(documentAnalysis).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertChatTranscriptSchema = createInsertSchema(chatTranscripts).omit({
  id: true,
  createdAt: true
} as any);

// Enhanced CRM Contact Management Tables
export const contacts: any = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant: varchar('tenant', { length: 10 }).notNull().default('bf'),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  company: varchar('company', { length: 255 }),
  email: varchar('email', { length: 255 }),
  canonicalEmail: varchar('canonical_email', { length: 255 }),
  phoneE164: varchar('phone_e164', { length: 20 }),
  notes: text('notes'), // Added missing notes column for contact API compatibility
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  // Legacy fields for compatibility
  name: varchar('name', { length: 255 }),
  businessName: varchar('business_name', { length: 255 }),
  craNumber: varchar('cra_number', { length: 50 }),
  applicationId: uuid('application_id').references(() => applications.id),
  role: varchar('role', { length: 50 }).default('Applicant'),
  companyName: varchar('company_name', { length: 255 }),
  jobTitle: varchar('job_title', { length: 100 }),
  source: leadSourceEnum('source').default('application'),
  referralId: varchar('referral_id', { length: 100 }),
  status: varchar('status', { length: 50 }).default('active'),
  tenantId: uuid('tenant_id'),
  phone: varchar('phone', { length: 20 })
});

export const contactLogs = pgTable('contact_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  type: varchar('type', { length: 50 }).notNull(), // 'sms' | 'call' | 'email' | 'note' | 'system'
  direction: varchar('direction', { length: 20 }), // 'inbound' | 'outbound' | null
  content: text('content').notNull(),
  staffUserId: uuid('staff_user_id').references(() => users.id),
  metadata: jsonb('metadata'), // For storing additional data like call duration, SMS delivery status
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const notes = pgTable('notes', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  content: text('content').notNull(),
  staffUserId: uuid('staff_user_id').notNull().references(() => users.id),
  pinned: boolean('pinned').default(false),
  isPrivate: boolean('is_private').default(false),
  tags: text('tags').array(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Clean Lender Schema per specification
export const lenders = pgTable('lenders', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name').notNull(),
  address: text('address'),
  mainPhone: varchar('main_phone'),
  mainContactFirst: varchar('main_contact_first'),
  mainContactLast: varchar('main_contact_last'),
  mainContactMobile: varchar('main_contact_mobile'),
  mainContactEmail: varchar('main_contact_email'),
  url: varchar('url'),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const lenderUsers = pgTable('lender_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  lenderId: uuid('lender_id').notNull().references(() => lenders.id),
  email: varchar('email', { length: 255 }).notNull().unique(),
  firstName: varchar('first_name', { length: 100 }),
  lastName: varchar('last_name', { length: 100 }),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  status: varchar('status', { length: 50 }).notNull().default('active'),
  role: varchar('role', { length: 50 }).notNull().default('lender'),
  permissions: jsonb('permissions'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Clean Lender Products Schema per specification
export const lenderProducts = pgTable("lender_products", {
  id: varchar("id", { length: 50 }).primaryKey(),
  lenderId: uuid("lender_id").references(() => lenders.id),
  productName: varchar("product_name").notNull(),
  category: lenderCategoryEnum("category").notNull(),
  minAmount: integer("amount_min").notNull(),
  maxAmount: integer("amount_max").notNull(),
  minTermMonths: integer("min_term_months"),
  maxTermMonths: integer("max_term_months"),
  minInterest: decimal("min_interest", { precision: 5, scale: 2 }),
  maxInterest: decimal("max_interest", { precision: 5, scale: 2 }),
  minCreditScore: integer("min_credit_score"),
  minAnnualRevenue: integer("min_annual_revenue"),
  minTimeBusinessMonths: integer("min_time_business_months"),
  preferredIndustries: text("preferred_industries"),
  excludedIndustries: text("excluded_industries"),
  country: varchar("country"),
  requiredDocuments: text("required_documents"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// CRM Commission Tracking
export const crmCommissions = pgTable('crm_commissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicationId: uuid('application_id').notNull().references(() => applications.id),
  lenderProductId: uuid('lender_product_id').notNull().references(() => lenderProducts.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  recordedAt: timestamp('recorded_at').defaultNow(),
  paid: boolean('paid').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Communication logs for lender messaging - unique table name to avoid conflicts
export const lenderCommLogs = pgTable('lender_comm_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  lenderId: uuid('lender_id').references(() => lenders.id),
  type: varchar('type', { length: 20 }).notNull(), // 'sms', 'email'
  recipient: varchar('recipient', { length: 255 }).notNull(),
  message: text('message').notNull(),
  subject: varchar('subject', { length: 255 }),
  status: varchar('status', { length: 20 }).default('sent'),
  createdAt: timestamp('created_at').defaultNow()
});

// Twilio Integration Tables
export const callLogs = pgTable('call_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id),
  staffUserId: uuid('staff_user_id').references(() => users.id),
  twilioCallSid: varchar('twilio_call_sid', { length: 100 }),
  fromNumber: varchar('from_number', { length: 20 }),
  toNumber: varchar('to_number', { length: 20 }),
  status: varchar('status', { length: 50 }), // initiated, ringing, answered, completed, failed
  direction: varchar('direction', { length: 20 }), // inbound, outbound
  duration: integer('duration'), // in seconds
  recordingUrl: varchar('recording_url', { length: 500 }),
  startTime: timestamp('start_time'),
  endTime: timestamp('end_time'),
  createdAt: timestamp('created_at').defaultNow()
});

// Enhanced Voice System Tables
export const calls = pgTable('calls', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant: varchar('tenant', { length: 10 }).notNull().default('bf'),
  contactId: uuid('contact_id').references(() => contacts.id),
  direction: text('direction').notNull(), // 'in' | 'out'
  fromE164: varchar('from_e164', { length: 20 }),
  toE164: varchar('to_e164', { length: 20 }),
  twilioCallSid: text('twilio_call_sid').unique(),
  transcript: text('transcript'),
  durationSec: integer('duration_sec'),
  createdAt: timestamp('created_at').defaultNow(),
  // Legacy fields for compatibility
  providerCallSid: text('provider_call_sid').unique(),
  isConference: boolean('is_conference').notNull().default(false),
  conferenceSid: text('conference_sid'),
  status: text('status'),
  startedAt: timestamp('started_at').defaultNow(),
  endedAt: timestamp('ended_at'),
  meta: jsonb('meta').notNull().default({})
});

export const callParticipants = pgTable('call_participants', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: uuid('call_id').notNull().references(() => calls.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('participant')
});

export const callRecordings = pgTable('call_recordings', {
  id: uuid('id').primaryKey().defaultRandom(),
  callId: uuid('call_id').notNull().references(() => calls.id, { onDelete: 'cascade' }),
  providerRecordingSid: text('provider_recording_sid').unique(),
  providerUri: text('provider_uri'),
  durationSec: integer('duration_sec'),
  audioFormat: text('audio_format'),
  createdAt: timestamp('created_at').defaultNow()
});

export const callTranscripts = pgTable('call_transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  recordingId: uuid('recording_id').notNull().references(() => callRecordings.id, { onDelete: 'cascade' }),
  status: text('status').notNull().default('queued'),
  language: text('language').default('en'),
  text: text('text'),
  summary: text('summary'),
  error: text('error'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const smsMessages = pgTable('sms_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id),
  staffUserId: uuid('staff_user_id').references(() => users.id),
  twilioMessageSid: varchar('twilio_message_sid', { length: 100 }),
  fromNumber: varchar('from_number', { length: 20 }),
  toNumber: varchar('to_number', { length: 20 }),
  direction: varchar('direction', { length: 20 }), // inbound, outbound
  body: text('body'),
  status: varchar('status', { length: 50 }), // sent, delivered, failed, received
  mediaUrls: text('media_urls').array(),
  threadId: uuid('thread_id'), // For grouping SMS conversations
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Microsoft Graph/Office 365 Integration Tables
export const emailAccounts = pgTable('email_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffUserId: uuid('staff_user_id').notNull().references(() => users.id),
  microsoftId: varchar('microsoft_id', { length: 255 }),
  emailAddress: varchar('email_address', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 255 }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),
  isSharedMailbox: boolean('is_shared_mailbox').default(false),
  status: varchar('status', { length: 50 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const emailThreads = pgTable('email_threads', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id),
  subject: varchar('subject', { length: 500 }),
  threadId: varchar('thread_id', { length: 255 }), // Microsoft Graph thread ID
  lastMessageAt: timestamp('last_message_at'),
  messageCount: integer('message_count').default(0),
  isRead: boolean('is_read').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const emailMessages2 = pgTable('email_messages2', {
  id: uuid('id').primaryKey().defaultRandom(),
  threadId: uuid('thread_id').references(() => emailThreads.id),
  contactId: uuid('contact_id').references(() => contacts.id),
  staffUserId: uuid('staff_user_id').references(() => users.id),
  microsoftMessageId: varchar('microsoft_message_id', { length: 255 }),
  fromAddress: varchar('from_address', { length: 255 }),
  toAddresses: text('to_addresses').array(),
  ccAddresses: text('cc_addresses').array(),
  subject: varchar('subject', { length: 500 }),
  body: text('body'),
  bodyPreview: text('body_preview'),
  direction: varchar('direction', { length: 20 }), // inbound, outbound
  isRead: boolean('is_read').default(false),
  hasAttachments: boolean('has_attachments').default(false),
  importance: varchar('importance', { length: 20 }).default('normal'),
  openTrackingPixelUrl: varchar('open_tracking_pixel_url', { length: 500 }),
  openCount: integer('open_count').default(0),
  firstOpenedAt: timestamp('first_opened_at'),
  lastOpenedAt: timestamp('last_opened_at'),
  sentAt: timestamp('sent_at'),
  receivedAt: timestamp('received_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Create insert schemas for new tables
export const insertSiloSchema = createInsertSchema(silos).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertContactLogSchema = createInsertSchema(contactLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertNoteSchema = createInsertSchema(notes).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertLenderUserSchema = createInsertSchema(lenderUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

// Clean Lender validation schema
export const insertLenderSchema = createInsertSchema(lenders, {
  name: z.string().min(1, "Lender name is required"),
  address: z.string().optional(),
  mainPhone: z.string().optional(),
  mainContactFirst: z.string().optional(),
  mainContactLast: z.string().optional(),
  mainContactMobile: z.string().optional(),
  mainContactEmail: z.string().email().optional().or(z.literal("")),
  url: z.string().url().optional().or(z.literal("")),
  description: z.string().optional()
} as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any);

export type InsertLender = z.infer<typeof insertLenderSchema>;

export const insertLenderProductSchema = createInsertSchema(lenderProducts, {
  lenderId: z.string().uuid("Lender ID is required"),
  productName: z.string().min(1, "Product name is required"),
  category: z.string().min(1),
  minAmount: z.number().min(1),
  maxAmount: z.number().min(1),
  minTermMonths: z.number().optional(),
  maxTermMonths: z.number().optional(),
  minInterest: z.number().optional(),
  maxInterest: z.number().optional(),
  minCreditScore: z.number().optional(),
  minAnnualRevenue: z.number().optional(),
  minTimeBusinessMonths: z.number().optional(),
  preferredIndustries: z.string().optional(),
  excludedIndustries: z.string().optional(),
  country: z.string().optional(),
  requiredDocuments: z.string().optional(),
  isActive: z.boolean().default(true)
} as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
} as any);

export type InsertLenderProduct = z.infer<typeof insertLenderProductSchema>;

export const insertCallLogSchema = createInsertSchema(callLogs).omit({
  id: true,
  createdAt: true
} as any);

export const insertCallSchema = createInsertSchema(calls).omit({
  id: true,
  startedAt: true
} as any);

export const insertCallParticipantSchema = createInsertSchema(callParticipants).omit({
  id: true
} as any);

export const insertCallRecordingSchema = createInsertSchema(callRecordings).omit({
  id: true,
  createdAt: true
} as any);

export const insertCallTranscriptSchema = createInsertSchema(callTranscripts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertSmsMessageSchema = createInsertSchema(smsMessages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertEmailAccountSchema = createInsertSchema(emailAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertEmailThreadSchema = createInsertSchema(emailThreads).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertEmailMessage2Schema = createInsertSchema(emailMessages2).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

// Office 365 Integration Table
export const o365Tokens = pgTable('o365_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id).unique(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  scope: text('scope'),
  microsoftUserId: varchar('microsoft_user_id', { length: 255 }),
  microsoftEmail: varchar('microsoft_email', { length: 255 }),
  microsoftDisplayName: varchar('microsoft_display_name', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const insertO365TokenSchema = createInsertSchema(o365Tokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

// Connected Accounts table for OAuth integrations (replaces o365Tokens)
export const connectedAccounts = pgTable('connected_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: oauthProviderEnum('provider').notNull(),
  providerId: varchar('provider_id', { length: 255 }), // Provider's user ID
  providerEmail: varchar('provider_email', { length: 255 }),
  providerDisplayName: varchar('provider_display_name', { length: 255 }),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  scopes: text('scopes').array(), // Array of granted permissions
  isActive: boolean('is_active').default(true),
  lastSyncAt: timestamp('last_sync_at'),
  metadata: jsonb('metadata'), // Provider-specific data
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  // Unique constraint: one account per provider per user
  uniqueUserProvider: {name: 'unique_user_provider', columns: [table.userId, table.provider]},
  // Index for fast lookups
  userIdIndex: {name: 'connected_accounts_user_id_idx', columns: [table.userId]},
  providerIndex: {name: 'connected_accounts_provider_idx', columns: [table.provider]}
}));

export const insertConnectedAccountSchema = createInsertSchema(connectedAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export type InsertConnectedAccount = z.infer<typeof insertConnectedAccountSchema>;
export type ConnectedAccount = typeof connectedAccounts.$inferSelect;

// OAuth Tokens table for storing access/refresh tokens
export const oauthTokens = pgTable('oauth_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: oauthProviderEnum('provider').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  scope: text('scope'),
  tokenType: varchar('token_type', { length: 50 }).default('Bearer'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  // Unique constraint: one token set per provider per user
  uniqueUserProvider: {name: 'unique_oauth_user_provider', columns: [table.userId, table.provider]},
  // Index for fast user lookups
  userIdIndex: {name: 'oauth_tokens_user_id_idx', columns: [table.userId]},
  // Index for provider lookups
  providerIndex: {name: 'oauth_tokens_provider_idx', columns: [table.provider]}
}));

export const insertOauthTokenSchema = createInsertSchema(oauthTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export type InsertOauthToken = z.infer<typeof insertOauthTokenSchema>;
export type OauthToken = typeof oauthTokens.$inferSelect;

// Enhanced User types for production-ready User Management
export const insertUserSchema = createInsertSchema(users, {
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  mobilePhone: z.string().min(10, "Valid mobile phone is required for SMS 2FA"),
  role: z.enum(['admin', 'staff', 'marketing', 'lender', 'referrer']),
  department: z.string().optional(),
  is2FAEnabled: z.boolean().default(true),
  isActive: z.boolean().default(true)
} as any).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  passwordHash: true
} as any);

export const updateUserSchema = insertUserSchema.partial().extend({
  id: z.string().uuid()
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type User = typeof users.$inferSelect;

// Lead Sources Configuration Table - for multiple source support
export const leadSources = pgTable('lead_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(), // 'Main Line', 'Partner Referral', etc.
  sourceType: leadSourceEnum('source_type').notNull(),
  twilioNumber: varchar('twilio_number', { length: 20 }), // Associated phone number
  defaultRole: userRoleEnum('default_role').default('staff'), // Role for users assigned to this source
  isActive: boolean('is_active').default(true),
  referralIdRequired: boolean('referral_id_required').default(false),
  webhookUrl: varchar('webhook_url', { length: 500 }), // For API integrations
  metadata: jsonb('metadata'), // Additional configuration
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const insertLeadSourceSchema = createInsertSchema(leadSources).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

// Deletion logs table for audit trail
export const deletionLogs = pgTable('deletion_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  entity: varchar('entity', { length: 50 }).notNull(), // 'contact', 'application', 'document', etc.
  entityId: uuid('entity_id').notNull(),
  deletedBy: uuid('deleted_by').references(() => users.id),
  reason: text('reason'),
  metadata: jsonb('metadata'), // Additional context about the deletion
  timestamp: timestamp('timestamp').defaultNow(),
  createdAt: timestamp('created_at').defaultNow()
});

// Chat related tables
export const chatSessions = pgTable('chat_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: varchar('session_id', { length: 255 }).notNull().unique(),
  userName: varchar('user_name', { length: 255 }),
  userEmail: varchar('user_email', { length: 255 }),
  userPhone: varchar('user_phone', { length: 20 }),
  contactId: uuid('contact_id').references(() => contacts.id),
  applicationId: uuid('application_id').references(() => applications.id),
  status: varchar('status', { length: 50 }).notNull().default('waiting'),
  priority: varchar('priority', { length: 20 }).default('normal'),
  assignedStaffId: uuid('assigned_staff_id').references(() => users.id),
  startedAt: timestamp('started_at').defaultNow(),
  lastActivity: timestamp('last_activity').defaultNow(),
  endedAt: timestamp('ended_at'),
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: uuid('session_id').notNull().references(() => chatSessions.id),
  role: varchar('role', { length: 20 }).notNull(), // 'user', 'staff', 'assistant'
  message: text('message').notNull(),
  userId: uuid('user_id').references(() => users.id),
  staffUserId: uuid('staff_user_id').references(() => users.id),
  metadata: jsonb('metadata'), // For storing additional message data
  sentAt: timestamp('sent_at').defaultNow(),
  tenantId: uuid('tenant_id'),
  createdAt: timestamp('created_at').defaultNow()
});

// Communication logs table (matches actual database structure)
export const communicationLogs = pgTable('communication_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  contactId: uuid('contact_id').references(() => contacts.id),
  type: varchar('type', { length: 50 }).notNull(),
  direction: varchar('direction', { length: 50 }).notNull(),
  phoneNumber: varchar('phone_number', { length: 50 }),
  content: text('content'),
  status: varchar('status', { length: 50 }).default('pending'),
  source: text('source').default('SLF'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const chatEscalations = pgTable('chat_escalations', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  userName: varchar('user_name', { length: 255 }),
  userEmail: varchar('user_email', { length: 255 }),
  message: text('message'),
  escalationReason: varchar('escalation_reason', { length: 100 }),
  applicationId: uuid('application_id').references(() => applications.id),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  assignedStaffId: uuid('assigned_staff_id').references(() => users.id),
  resolution: text('resolution'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const chatIssueReports = pgTable('chat_issue_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  sessionId: varchar('session_id', { length: 255 }).notNull(),
  userName: varchar('user_name', { length: 255 }),
  userEmail: varchar('user_email', { length: 255 }),
  issueType: varchar('issue_type', { length: 100 }).notNull(),
  description: text('description'),
  severity: varchar('severity', { length: 20 }).notNull().default('medium'),
  applicationId: uuid('application_id').references(() => applications.id),
  status: varchar('status', { length: 50 }).notNull().default('open'),
  resolvedBy: uuid('resolved_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Recommendation Analytics Tables
export const recommendationLogs = pgTable('recommendation_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  applicantId: uuid('applicant_id').notNull(),
  recommendedLenders: jsonb('recommended_lenders'),
  rejectedLenders: jsonb('rejected_lenders'),
  filtersApplied: jsonb('filters_applied'),
  createdAt: timestamp('created_at').defaultNow()
});

// Audit Logs table for tracking all system actions
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'application', 'document', 'user', etc.
  entityId: varchar('entity_id', { length: 255 }).notNull(), // ID of the entity being tracked
  action: varchar('action', { length: 100 }).notNull(), // 'stage_changed', 'document_uploaded', 'note_added', etc.
  details: text('details'), // Human-readable description
  userId: varchar('user_id', { length: 255 }), // Who performed the action
  metadata: jsonb('metadata'), // Additional structured data
  createdAt: timestamp('created_at').defaultNow()
});

export const passkeys = pgTable('passkeys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credId: text('cred_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  deviceType: text('device_type'),
  backedUp: boolean('backed_up'),
  transports: text('transports'), // JSON string
  label: text('label').default('Passkey'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at').defaultNow().notNull(),
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true
} as any);

export const insertChatEscalationSchema = createInsertSchema(chatEscalations).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertChatIssueReportSchema = createInsertSchema(chatIssueReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertRecommendationLogSchema = createInsertSchema(recommendationLogs).omit({
  id: true,
  createdAt: true
} as any);

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true
} as any);

// Types
export type InsertSilo = z.infer<typeof insertSiloSchema>;
// InsertUser type moved to production section
export type InsertDeviceRegistration = z.infer<typeof insertDeviceRegistrationSchema>;
export type DeviceRegistration = typeof deviceRegistrations.$inferSelect;
export type InsertApplication = z.infer<typeof insertApplicationSchema>;
export type InsertBusiness = z.infer<typeof insertBusinessSchema>;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type InsertRetryUploadLog = z.infer<typeof insertRetryUploadLogSchema>;
export type InsertEmailMessage = z.infer<typeof insertEmailMessageSchema>;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type InsertContactLog = z.infer<typeof insertContactLogSchema>;
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type InsertCallLog = z.infer<typeof insertCallLogSchema>;
export type InsertCall = z.infer<typeof insertCallSchema>;
export type InsertCallParticipant = z.infer<typeof insertCallParticipantSchema>;
export type InsertCallRecording = z.infer<typeof insertCallRecordingSchema>;
export type InsertCallTranscript = z.infer<typeof insertCallTranscriptSchema>;
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;
export type InsertEmailAccount = z.infer<typeof insertEmailAccountSchema>;
export type InsertEmailThread = z.infer<typeof insertEmailThreadSchema>;
export type InsertEmailMessage2 = z.infer<typeof insertEmailMessage2Schema>;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type InsertChatEscalation = z.infer<typeof insertChatEscalationSchema>;
export type InsertChatIssueReport = z.infer<typeof insertChatIssueReportSchema>;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type Silo = typeof silos.$inferSelect;
// User type already exported above in production section
export type Application = typeof applications.$inferSelect;
export type Business = typeof businesses.$inferSelect;
export type Document = typeof documents.$inferSelect;
export type RetryUploadLog = typeof retryUploadLogs.$inferSelect;
export type EmailMessage = typeof emailMessages.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type ContactLog = typeof contactLogs.$inferSelect;
export type Lender = typeof lenders.$inferSelect;
export type LenderUser = typeof lenderUsers.$inferSelect;
export type LenderProduct = typeof lenderProducts.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type CallLog = typeof callLogs.$inferSelect;
export type Call = typeof calls.$inferSelect;
export type CallParticipant = typeof callParticipants.$inferSelect;
export type CallRecording = typeof callRecordings.$inferSelect;
export type CallTranscript = typeof callTranscripts.$inferSelect;
export type SmsMessage = typeof smsMessages.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type EmailAccount = typeof emailAccounts.$inferSelect;
export type EmailThread = typeof emailThreads.$inferSelect;
export type EmailMessage2 = typeof emailMessages2.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type ChatEscalation = typeof chatEscalations.$inferSelect;
export type ChatIssueReport = typeof chatIssueReports.$inferSelect;

// Approval Requests table for SMS approval system
export const approvalRequests = pgTable('approval_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant: varchar('tenant', { length: 10 }).notNull().default('bf'),
  status: approvalStatusEnum('status').notNull().default('queued'),
  channel: approvalChannelEnum('channel').notNull(),
  action: approvalActionEnum('action').notNull(),
  contactId: uuid('contact_id').references(() => contacts.id),
  applicationId: uuid('application_id').references(() => applications.id),
  toAddress: varchar('to_address', { length: 255 }),
  approverPhone: varchar('approver_phone', { length: 20 }).notNull(),
  code: varchar('code', { length: 10 }).notNull(),
  preview: varchar('preview', { length: 500 }),
  body: text('body'),
  meta: jsonb('meta'),
  createdBy: uuid('created_by').references(() => users.id),
  approvedBy: uuid('approved_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Activities table for contact/application timeline
export const activities = pgTable('activities', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant: varchar('tenant', { length: 10 }).notNull().default('bf'),
  type: varchar('type', { length: 100 }).notNull(), // email_sent, sms_sent, call_in, approval_requested, etc.
  contactId: uuid('contact_id').references(() => contacts.id),
  applicationId: uuid('application_id').references(() => applications.id),
  preview: varchar('preview', { length: 500 }),
  meta: jsonb('meta'),
  at: timestamp('at').defaultNow()
});

// OCRDocument table for document processing
export const ocrDocuments = pgTable('ocr_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant: varchar('tenant', { length: 10 }).notNull().default('bf'),
  contactId: uuid('contact_id').references(() => contacts.id),
  appId: uuid('app_id').references(() => applications.id),
  docType: varchar('doc_type', { length: 100 }).notNull(), // bank_statement, tax_return, financials, etc.
  periodFrom: timestamp('period_from'),
  periodTo: timestamp('period_to'),
  year: integer('year'),
  fileUrl: varchar('file_url', { length: 500 }),
  status: varchar('status', { length: 50 }).notNull().default('uploaded'), // uploaded|processing|parsed|failed
  piiLevel: varchar('pii_level', { length: 50 }), // field-level encryption policy
  fields: jsonb('fields'), // parsed field map (temporary cache)
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Schema and types for ApprovalRequest
export const insertApprovalRequestSchema = createInsertSchema(approvalRequests).omit({ id: true, createdAt: true, updatedAt: true } as any);
export type InsertApprovalRequest = z.infer<typeof insertApprovalRequestSchema>;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;

// Schema and types for Activities
export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, at: true } as any);
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

// Schema and types for OCRDocument
export const insertOcrDocumentSchema = createInsertSchema(ocrDocuments).omit({ id: true, createdAt: true, updatedAt: true } as any);
export type InsertOcrDocument = z.infer<typeof insertOcrDocumentSchema>;
export type OcrDocument = typeof ocrDocuments.$inferSelect;

// User Audit Log table for tracking user management actions
export const userAuditLog = pgTable('user_audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  action: varchar('action', { length: 100 }).notNull(),
  targetUserId: uuid('target_user_id').references(() => users.id),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow()
});

// Schema and types for User Audit Log
export const insertUserAuditLogSchema = createInsertSchema(userAuditLog).omit({ id: true, createdAt: true } as any);
export type InsertUserAuditLog = z.infer<typeof insertUserAuditLogSchema>;
export type UserAuditLog = typeof userAuditLog.$inferSelect;

// ===== BACKEND PARITY: Critical Missing Tables =====

// 1. Banking Analysis System (Backend parity)
export const bankConnections = pgTable("bank_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  provider: text("provider").notNull(), // plaid, synapse, etc
  externalId: text("external_id").notNull(),
  status: jsonb("status").default({}),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").references(() => applications.id),
  connectionId: uuid("connection_id").references(() => bankConnections.id),
  institution: text("institution"),
  mask: text("mask"),
  currency: text("currency").default("USD"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bankTransactions = pgTable("bank_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").references(() => bankAccounts.id),
  date: timestamp("date").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  type: text("type"),
  description: text("description"),
  category: text("category"),
  raw: jsonb("raw").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bankingAnalysis = pgTable("banking_analysis", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").references(() => applications.id),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  metrics: jsonb("metrics").notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Recommendation Engine (Backend parity)
export const recommendationRules = pgTable("recommendation_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  priority: integer("priority").default(100),
  rule: jsonb("rule").notNull(), // JSONLogic or custom DSL
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const recommendationRuns = pgTable("recommendation_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").references(() => applications.id),
  status: text("status").default("running"),
  input: jsonb("input").default({}),
  startedAt: timestamp("started_at").defaultNow(),
  finishedAt: timestamp("finished_at"),
});

export const recommendationResults = pgTable("recommendation_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  runId: uuid("run_id").references(() => recommendationRuns.id),
  lenderId: uuid("lender_id").references(() => lenders.id),
  productId: uuid("product_id").references(() => lenderProducts.id),
  score: decimal("score", { precision: 5, scale: 3 }).notNull(),
  reasons: jsonb("reasons").default({}),
});

// 3. OCR Job Orchestration (Backend parity)
export const ocrJobs = pgTable("ocr_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").references(() => documents.id),
  provider: text("provider").default("openai"),
  status: text("status").default("queued"), // queued, running, completed, failed
  params: jsonb("params").default({}),
  attempts: integer("attempts").default(0),
  lastError: text("last_error"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 4. Provider & Integration Management (Backend parity)
export const providerAccounts = pgTable("provider_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(), // twilio, sendgrid, openai, plaid, credit
  name: text("name").notNull(),
  status: text("status").default("connected"),
  credentials: jsonb("credentials").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const webhookSubscriptions = pgTable("webhook_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(), // crm, banking, client-app, etc.
  url: text("url").notNull(),
  secret: text("secret"),
  events: text("events").array().notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  source: text("source").notNull(),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  status: text("status").default("pending"),
  error: text("error"),
});

// 5. System Settings & Feature Flags (Backend parity)
export const systemSettings = pgTable("system_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").default(false),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 6. Enhanced Audit Logs (Backend parity)
export const auditLogsSystem = pgTable("audit_logs_system", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorType: text("actor_type").notNull(), // user, system, api
  actorId: text("actor_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id"),
  ip: text("ip"),
  ua: text("ua"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ===== SCHEMAS FOR NEW BACKEND PARITY TABLES =====

// Banking Analysis schemas
export const insertBankConnectionSchema = createInsertSchema(bankConnections).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertBankTransactionSchema = createInsertSchema(bankTransactions).omit({
  id: true,
  createdAt: true
} as any);

export const insertBankingAnalysisSchema = createInsertSchema(bankingAnalysis).omit({
  id: true,
  createdAt: true
} as any);

// Recommendation Engine schemas
export const insertRecommendationRuleSchema = createInsertSchema(recommendationRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertRecommendationRunSchema = createInsertSchema(recommendationRuns).omit({
  id: true,
  startedAt: true
} as any);

export const insertRecommendationResultSchema = createInsertSchema(recommendationResults).omit({
  id: true
} as any);

// OCR Jobs schema
export const insertOcrJobSchema = createInsertSchema(ocrJobs).omit({
  id: true,
  createdAt: true
} as any);

// Provider & System schemas
export const insertProviderAccountSchema = createInsertSchema(providerAccounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true
} as any);

export const insertWebhookSubscriptionSchema = createInsertSchema(webhookSubscriptions).omit({
  id: true,
  createdAt: true
} as any);

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  receivedAt: true
} as any);

export const insertSystemSettingSchema = createInsertSchema(systemSettings).omit({
  updatedAt: true
} as any);

export const insertFeatureFlagSchema = createInsertSchema(featureFlags).omit({
  updatedAt: true
} as any);

export const insertAuditLogSystemSchema = createInsertSchema(auditLogsSystem).omit({
  id: true,
  createdAt: true
} as any);

// ===== TYPES FOR NEW BACKEND PARITY TABLES =====

// Banking Analysis types
export type InsertBankConnection = z.infer<typeof insertBankConnectionSchema>;
export type BankConnection = typeof bankConnections.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;
export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankTransaction = z.infer<typeof insertBankTransactionSchema>;
export type BankTransaction = typeof bankTransactions.$inferSelect;
export type InsertBankingAnalysis = z.infer<typeof insertBankingAnalysisSchema>;
export type BankingAnalysis = typeof bankingAnalysis.$inferSelect;

// Recommendation Engine types
export type InsertRecommendationRule = z.infer<typeof insertRecommendationRuleSchema>;
export type RecommendationRule = typeof recommendationRules.$inferSelect;
export type InsertRecommendationRun = z.infer<typeof insertRecommendationRunSchema>;
export type RecommendationRun = typeof recommendationRuns.$inferSelect;
export type InsertRecommendationResult = z.infer<typeof insertRecommendationResultSchema>;
export type RecommendationResult = typeof recommendationResults.$inferSelect;

// OCR Jobs types
export type InsertOcrJob = z.infer<typeof insertOcrJobSchema>;
export type OcrJob = typeof ocrJobs.$inferSelect;

// Provider & System types
export type InsertProviderAccount = z.infer<typeof insertProviderAccountSchema>;
export type ProviderAccount = typeof providerAccounts.$inferSelect;
export type InsertWebhookSubscription = z.infer<typeof insertWebhookSubscriptionSchema>;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type InsertSystemSetting = z.infer<typeof insertSystemSettingSchema>;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type InsertFeatureFlag = z.infer<typeof insertFeatureFlagSchema>;
export type FeatureFlag = typeof featureFlags.$inferSelect;
export type InsertAuditLogSystem = z.infer<typeof insertAuditLogSystemSchema>;
export type AuditLogSystem = typeof auditLogsSystem.$inferSelect;
// Export marketing schemas for unified access
export * from './marketing-schema';


