"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertSiloSchema = exports.emailMessages2 = exports.emailThreads = exports.emailAccounts = exports.smsMessages = exports.callTranscripts = exports.callRecordings = exports.callParticipants = exports.calls = exports.callLogs = exports.lenderProducts = exports.lenderUsers = exports.lenders = exports.notes = exports.contactLogs = exports.contacts = exports.insertChatTranscriptSchema = exports.insertDocumentAnalysisSchema = exports.insertDocumentBackupSchema = exports.insertScheduledNotificationSchema = exports.chatTranscripts = exports.documentAnalysis = exports.documentBackups = exports.scheduledNotifications = exports.insertEmailMessageSchema = exports.emailMessages = exports.insertRetryUploadLogSchema = exports.insertDocumentSchema = exports.insertBusinessSchema = exports.insertApplicationSchema = exports.insertDeviceRegistrationSchema = exports.insertUserSchema = exports.documentUploadLog = exports.applicationDeletionLog = exports.retryUploadLogs = exports.expectedDocuments = exports.documents = exports.businesses = exports.applications = exports.deviceRegistrations = exports.passwordResetTokens = exports.users = exports.silos = exports.backupStatusEnum = exports.userRoleEnum = exports.siloEnum = exports.devicePlatformEnum = exports.leadSourceEnum = exports.statusEnum = exports.documentTypeEnum = void 0;
exports.insertAuditLogSchema = exports.insertRecommendationLogSchema = exports.insertChatIssueReportSchema = exports.insertChatEscalationSchema = exports.insertChatMessageSchema = exports.insertChatSessionSchema = exports.passkeys = exports.auditLogs = exports.recommendationLogs = exports.chatIssueReports = exports.chatEscalations = exports.communicationLogs = exports.chatMessages = exports.chatSessions = exports.deletionLogs = exports.insertLeadSourceSchema = exports.leadSources = exports.insertO365TokenSchema = exports.o365Tokens = exports.insertEmailMessage2Schema = exports.insertEmailThreadSchema = exports.insertEmailAccountSchema = exports.insertSmsMessageSchema = exports.insertCallTranscriptSchema = exports.insertCallRecordingSchema = exports.insertCallParticipantSchema = exports.insertCallSchema = exports.insertCallLogSchema = exports.insertLenderProductSchema = exports.insertLenderSchema = exports.insertLenderUserSchema = exports.insertNoteSchema = exports.insertContactLogSchema = exports.insertContactSchema = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
// Import enum lock validation
const documentLock_1 = require("../server/db/schema/documentLock");
// Validate enum modification before definition
(0, documentLock_1.validateEnumModification)('document_type');
// Create enums for status fields
exports.documentTypeEnum = (0, pg_core_1.pgEnum)('document_type', [
    'bank_statements',
    'financial_statements',
    'tax_returns',
    'business_license',
    'articles_of_incorporation',
    'account_prepared_financials',
    'pnl_statement',
    'other'
]);
exports.statusEnum = (0, pg_core_1.pgEnum)('status', [
    'pending',
    'processing',
    'completed',
    'failed'
]);
// Lead source and role enums for Partner Referral System
exports.leadSourceEnum = (0, pg_core_1.pgEnum)('lead_source', [
    'application',
    'partner_referral',
    'direct_call',
    'web_inquiry',
    'manual_entry'
]);
// Device platform enum for multi-platform push notifications
exports.devicePlatformEnum = (0, pg_core_1.pgEnum)('device_platform', [
    'webpush',
    'fcm',
    'apns',
    'windows'
]);
// Silo enum for business unit targeting
exports.siloEnum = (0, pg_core_1.pgEnum)('silo', [
    'bf',
    'slf'
]);
exports.userRoleEnum = (0, pg_core_1.pgEnum)('user_role', [
    'client',
    'staff',
    'admin',
    'lender',
    'referral_agent'
]);
exports.backupStatusEnum = (0, pg_core_1.pgEnum)('backup_status', [
    'pending',
    'completed',
    'failed'
]);
// Main tables
exports.silos = (0, pg_core_1.pgTable)('silos', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    code: (0, pg_core_1.varchar)('code', { length: 10 }).notNull().unique(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(),
    color: (0, pg_core_1.varchar)('color', { length: 20 }).notNull(),
    logoUrl: (0, pg_core_1.varchar)('logo_url', { length: 500 }),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }),
    role: (0, exports.userRoleEnum)('role').notNull().default('client'),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    tenantId: (0, pg_core_1.uuid)('tenant_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    passwordResetToken: (0, pg_core_1.text)('password_reset_token'),
    passwordResetExpiresAt: (0, pg_core_1.timestamp)('password_reset_expires_at'),
    passwordIsTemporary: (0, pg_core_1.boolean)('password_is_temporary').default(false),
    otpCode: (0, pg_core_1.text)('otp_code'),
    otpExpires: (0, pg_core_1.timestamp)('otp_expires'),
    otpVerified: (0, pg_core_1.boolean)('otp_verified').default(false),
    mfaEnabled: (0, pg_core_1.boolean)('mfa_enabled').default(true),
    webauthnCredentials: (0, pg_core_1.jsonb)('webauthn_credentials'),
    pushSubscription: (0, pg_core_1.jsonb)('push_subscription'),
    lastLogin: (0, pg_core_1.timestamp)('last_login')
});
exports.passwordResetTokens = (0, pg_core_1.pgTable)('password_reset_tokens', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    token: (0, pg_core_1.text)('token').notNull().unique(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
// Device Registrations table for multi-platform push notifications
exports.deviceRegistrations = (0, pg_core_1.pgTable)('device_registrations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    platform: (0, exports.devicePlatformEnum)('platform').notNull(),
    token: (0, pg_core_1.text)('token').notNull(),
    silo: (0, exports.siloEnum)('silo').notNull().default('bf'),
    userAgent: (0, pg_core_1.text)('user_agent'),
    deviceInfo: (0, pg_core_1.jsonb)('device_info'),
    isActive: (0, pg_core_1.boolean)('is_active').notNull().default(true),
    lastUsed: (0, pg_core_1.timestamp)('last_used', { withTimezone: true }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
    // Ensure unique platform-token combinations
    uniquePlatformToken: { name: 'unique_platform_token', columns: [table.platform, table.token] },
    // Index for fast user lookups
    userIdIndex: { name: 'device_registrations_user_id_idx', columns: [table.userId] },
    // Index for silo-based targeting
    siloIndex: { name: 'device_registrations_silo_idx', columns: [table.silo] }
}));
exports.applications = (0, pg_core_1.pgTable)('applications', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.varchar)('user_id').references(() => exports.users.id),
    businessId: (0, pg_core_1.uuid)('business_id').references(() => exports.businesses.id),
    tenantId: (0, pg_core_1.uuid)('tenant_id'),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).notNull().default('draft'),
    stage: (0, pg_core_1.varchar)('stage', { length: 50 }).notNull().default('New'),
    requestedAmount: (0, pg_core_1.integer)('requested_amount'),
    useOfFunds: (0, pg_core_1.text)('use_of_funds'),
    currentStep: (0, pg_core_1.integer)('current_step'),
    formData: (0, pg_core_1.jsonb)('form_data'),
    submittedAt: (0, pg_core_1.timestamp)('submitted_at'),
    reviewedAt: (0, pg_core_1.timestamp)('reviewed_at'),
    reviewedBy: (0, pg_core_1.varchar)('reviewed_by'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    signed: (0, pg_core_1.boolean)('signed'),
    signedAt: (0, pg_core_1.timestamp)('signed_at'),
    signUrl: (0, pg_core_1.varchar)('sign_url'),
    bankingAnalysis: (0, pg_core_1.jsonb)('banking_analysis'),
    financialsOcr: (0, pg_core_1.jsonb)('financials_ocr'),
    documentApprovals: (0, pg_core_1.jsonb)('document_approvals'),
    productCategory: (0, pg_core_1.varchar)('product_category'),
    recommendedLenderId: (0, pg_core_1.varchar)('recommended_lender_id'),
    missingDocs: (0, pg_core_1.boolean)('missing_docs'),
    loanCategory: (0, pg_core_1.varchar)('loan_category'),
    legalBusinessName: (0, pg_core_1.varchar)('legal_business_name'),
    dbaName: (0, pg_core_1.varchar)('dba_name'),
    businessType: (0, pg_core_1.varchar)('business_type'),
    businessEmail: (0, pg_core_1.varchar)('business_email'),
    businessPhone: (0, pg_core_1.varchar)('business_phone'),
    businessAddress: (0, pg_core_1.text)('business_address'),
    contactFirstName: (0, pg_core_1.varchar)('contact_first_name'),
    contactLastName: (0, pg_core_1.varchar)('contact_last_name'),
    contactEmail: (0, pg_core_1.varchar)('contact_email'),
    contactPhone: (0, pg_core_1.varchar)('contact_phone'),
    ownerFirstName: (0, pg_core_1.varchar)('owner_first_name'),
    ownerLastName: (0, pg_core_1.varchar)('owner_last_name'),
    ownerSsn: (0, pg_core_1.varchar)('owner_ssn'),
    ownershipPercentage: (0, pg_core_1.integer)('ownership_percentage'),
    loanAmount: (0, pg_core_1.integer)('loan_amount'),
    repaymentTerms: (0, pg_core_1.varchar)('repayment_terms'),
    numberOfEmployees: (0, pg_core_1.integer)('number_of_employees'),
    annualRevenue: (0, pg_core_1.integer)('annual_revenue'),
    yearsInBusiness: (0, pg_core_1.integer)('years_in_business'),
    signingStatus: (0, pg_core_1.varchar)('signing_status'),
    legacyId: (0, pg_core_1.varchar)('legacy_id'),
    signedPdfDocumentId: (0, pg_core_1.uuid)('signed_pdf_document_id'),
    isReadyForLenders: (0, pg_core_1.boolean)('is_ready_for_lenders'),
    businessEntityType: (0, pg_core_1.varchar)('business_entity_type')
});
exports.businesses = (0, pg_core_1.pgTable)('businesses', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    businessName: (0, pg_core_1.varchar)('business_name', { length: 255 }).notNull(),
    legalBusinessName: (0, pg_core_1.varchar)('legal_business_name', { length: 255 }),
    businessType: (0, pg_core_1.varchar)('business_type', { length: 100 }),
    industry: (0, pg_core_1.varchar)('industry', { length: 100 }),
    yearEstablished: (0, pg_core_1.integer)('year_established'),
    employeeCount: (0, pg_core_1.integer)('employee_count'),
    annualRevenue: (0, pg_core_1.integer)('annual_revenue'),
    businessAddress: (0, pg_core_1.text)('business_address'),
    businessPhone: (0, pg_core_1.varchar)('business_phone', { length: 20 }),
    businessEmail: (0, pg_core_1.varchar)('business_email', { length: 255 }),
    website: (0, pg_core_1.varchar)('website', { length: 255 }),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.documents = (0, pg_core_1.pgTable)('documents', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    applicationId: (0, pg_core_1.uuid)('application_id').notNull().references(() => exports.applications.id),
    fileName: (0, pg_core_1.varchar)('file_name', { length: 255 }).notNull(),
    fileType: (0, pg_core_1.varchar)('file_type', { length: 100 }),
    fileSize: (0, pg_core_1.integer)('file_size'),
    documentType: (0, exports.documentTypeEnum)('document_type').notNull(),
    filePath: (0, pg_core_1.varchar)('file_path', { length: 500 }),
    uploadedBy: (0, pg_core_1.varchar)('uploaded_by', { length: 255 }),
    isRequired: (0, pg_core_1.boolean)('is_required').default(false),
    isVerified: (0, pg_core_1.boolean)('is_verified').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    status: (0, exports.statusEnum)('status').default('pending'),
    rejectionReason: (0, pg_core_1.text)('rejection_reason'),
    verifiedAt: (0, pg_core_1.timestamp)('verified_at'),
    reviewedBy: (0, pg_core_1.uuid)('reviewed_by'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow(),
    storageKey: (0, pg_core_1.varchar)('storage_key', { length: 500 }),
    checksum: (0, pg_core_1.varchar)('checksum', { length: 255 }),
    tags: (0, pg_core_1.text)('tags').array(),
    description: (0, pg_core_1.text)('description'),
    sha256: (0, pg_core_1.varchar)('sha256', { length: 64 }),
    versionNumber: (0, pg_core_1.integer)('version_number').default(1),
    previewStatus: (0, pg_core_1.varchar)('preview_status', { length: 50 }),
    fileExists: (0, pg_core_1.boolean)('file_exists').default(true),
    mimeType: (0, pg_core_1.varchar)('mime_type', { length: 100 }),
    sha256Checksum: (0, pg_core_1.varchar)('sha256_checksum', { length: 64 }),
    backupStatus: (0, exports.backupStatusEnum)('backup_status').default('pending'),
    objectStorageKey: (0, pg_core_1.varchar)('object_storage_key', { length: 500 }),
    storageStatus: (0, pg_core_1.varchar)('storage_status', { length: 50 })
});
exports.expectedDocuments = (0, pg_core_1.pgTable)('expected_documents', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    applicationId: (0, pg_core_1.uuid)('application_id').notNull().references(() => exports.applications.id),
    documentType: (0, exports.documentTypeEnum)('document_type').notNull(),
    isRequired: (0, pg_core_1.boolean)('is_required').default(true),
    description: (0, pg_core_1.text)('description'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
// NEW: Retry upload logs table for strict audit trail
exports.retryUploadLogs = (0, pg_core_1.pgTable)('retry_upload_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    applicationId: (0, pg_core_1.uuid)('application_id').notNull().references(() => exports.applications.id),
    fileName: (0, pg_core_1.varchar)('file_name', { length: 255 }).notNull(),
    documentType: (0, exports.documentTypeEnum)('document_type').notNull(),
    errorMessage: (0, pg_core_1.text)('error_message').notNull(),
    attempt: (0, pg_core_1.integer)('attempt').notNull(),
    retryScheduledAt: (0, pg_core_1.timestamp)('retry_scheduled_at'),
    retryCompletedAt: (0, pg_core_1.timestamp)('retry_completed_at'),
    retrySuccess: (0, pg_core_1.boolean)('retry_success'),
    finalErrorMessage: (0, pg_core_1.text)('final_error_message'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
// Application deletion log table (already created)
exports.applicationDeletionLog = (0, pg_core_1.pgTable)('application_deletion_log', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    applicationId: (0, pg_core_1.uuid)('application_id').notNull(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id),
    userEmail: (0, pg_core_1.varchar)('user_email', { length: 255 }),
    source: (0, pg_core_1.varchar)('source', { length: 50 }).notNull(),
    deletionReason: (0, pg_core_1.text)('deletion_reason'),
    ipAddress: (0, pg_core_1.varchar)('ip_address', { length: 45 }),
    userAgent: (0, pg_core_1.text)('user_agent'),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at').notNull(),
    applicationData: (0, pg_core_1.jsonb)('application_data'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
// Document upload log table (already exists)
exports.documentUploadLog = (0, pg_core_1.pgTable)('document_upload_log', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    documentId: (0, pg_core_1.uuid)('document_id'),
    applicationId: (0, pg_core_1.uuid)('application_id'),
    fileName: (0, pg_core_1.varchar)('file_name', { length: 255 }),
    uploadAttemptedAt: (0, pg_core_1.timestamp)('upload_attempted_at'),
    diskWriteSuccessful: (0, pg_core_1.boolean)('disk_write_successful'),
    s3BackupSuccessful: (0, pg_core_1.boolean)('s3_backup_successful'),
    checksumVerified: (0, pg_core_1.boolean)('checksum_verified'),
    errorMessage: (0, pg_core_1.text)('error_message'),
    recoveryAttemptedAt: (0, pg_core_1.timestamp)('recovery_attempted_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
// Insert schemas
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// Device registrations schemas
exports.insertDeviceRegistrationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.deviceRegistrations).omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    lastUsed: true
});
exports.insertApplicationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.applications).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertBusinessSchema = (0, drizzle_zod_1.createInsertSchema)(exports.businesses).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertDocumentSchema = (0, drizzle_zod_1.createInsertSchema)(exports.documents).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertRetryUploadLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.retryUploadLogs).omit({
    id: true,
    createdAt: true
});
// Email Messages table
exports.emailMessages = (0, pg_core_1.pgTable)('email_messages', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    accountId: (0, pg_core_1.integer)('account_id'),
    messageId: (0, pg_core_1.text)('message_id').unique(),
    threadId: (0, pg_core_1.text)('thread_id'),
    subject: (0, pg_core_1.text)('subject'),
    fromAddress: (0, pg_core_1.text)('from_address'),
    toAddresses: (0, pg_core_1.text)('to_addresses').array(),
    ccAddresses: (0, pg_core_1.text)('cc_addresses').array(),
    bccAddresses: (0, pg_core_1.text)('bcc_addresses').array(),
    replyTo: (0, pg_core_1.text)('reply_to'),
    body: (0, pg_core_1.text)('body'),
    bodyHtml: (0, pg_core_1.text)('body_html'),
    bodyText: (0, pg_core_1.text)('body_text'),
    messageDate: (0, pg_core_1.timestamp)('message_date'),
    isRead: (0, pg_core_1.boolean)('is_read').default(false),
    isStarred: (0, pg_core_1.boolean)('is_starred').default(false),
    isSent: (0, pg_core_1.boolean)('is_sent').default(false),
    isDraft: (0, pg_core_1.boolean)('is_draft').default(false),
    isDeleted: (0, pg_core_1.boolean)('is_deleted').default(false),
    hasAttachments: (0, pg_core_1.boolean)('has_attachments').default(false),
    attachmentCount: (0, pg_core_1.integer)('attachment_count').default(0),
    attachmentData: (0, pg_core_1.jsonb)('attachment_data'),
    contactId: (0, pg_core_1.integer)('contact_id'),
    applicationId: (0, pg_core_1.text)('application_id'),
    category: (0, pg_core_1.text)('category'),
    priority: (0, pg_core_1.text)('priority'),
    tags: (0, pg_core_1.text)('tags').array(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.insertEmailMessageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.emailMessages).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// New tables for Staff Application Full Upgrade
// Scheduled Notifications table
exports.scheduledNotifications = (0, pg_core_1.pgTable)('scheduled_notifications', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    applicationId: (0, pg_core_1.uuid)('application_id').references(() => exports.applications.id),
    type: (0, pg_core_1.varchar)('type', { length: 100 }).notNull(),
    payload: (0, pg_core_1.jsonb)('payload').notNull(),
    scheduledAt: (0, pg_core_1.timestamp)('scheduled_at').notNull(),
    sent: (0, pg_core_1.boolean)('sent').default(false),
    sentAt: (0, pg_core_1.timestamp)('sent_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
// Document Backups table for audit snapshots
exports.documentBackups = (0, pg_core_1.pgTable)('document_backups', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    backupDate: (0, pg_core_1.timestamp)('backup_date').notNull(),
    documentsCount: (0, pg_core_1.integer)('documents_count').notNull(),
    backupSizeMb: (0, pg_core_1.integer)('backup_size_mb'),
    s3Location: (0, pg_core_1.varchar)('s3_location', { length: 500 }),
    checksumSha256: (0, pg_core_1.varchar)('checksum_sha256', { length: 64 }),
    status: (0, exports.backupStatusEnum)('status').default('pending'),
    errorMessage: (0, pg_core_1.text)('error_message'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    completedAt: (0, pg_core_1.timestamp)('completed_at')
});
// Enhanced documents table with confidence scores and risk scoring
exports.documentAnalysis = (0, pg_core_1.pgTable)('document_analysis', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    documentId: (0, pg_core_1.uuid)('document_id').references(() => exports.documents.id),
    ocrResults: (0, pg_core_1.jsonb)('ocr_results'),
    confidenceScores: (0, pg_core_1.jsonb)('confidence_scores'),
    riskScore: (0, pg_core_1.integer)('risk_score'),
    fieldMismatches: (0, pg_core_1.jsonb)('field_mismatches'),
    extractedFields: (0, pg_core_1.jsonb)('extracted_fields'),
    analysisVersion: (0, pg_core_1.varchar)('analysis_version', { length: 20 }).default('1.0'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
// Chat Transcripts table
exports.chatTranscripts = (0, pg_core_1.pgTable)('chat_transcripts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sessionId: (0, pg_core_1.varchar)('session_id', { length: 255 }).notNull(),
    applicationId: (0, pg_core_1.uuid)('application_id').references(() => exports.applications.id),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id),
    messages: (0, pg_core_1.jsonb)('messages').notNull(),
    startedAt: (0, pg_core_1.timestamp)('started_at').defaultNow(),
    endedAt: (0, pg_core_1.timestamp)('ended_at'),
    escalationId: (0, pg_core_1.uuid)('escalation_id').references(() => exports.chatEscalations.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
// Insert schemas for new tables
exports.insertScheduledNotificationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.scheduledNotifications).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertDocumentBackupSchema = (0, drizzle_zod_1.createInsertSchema)(exports.documentBackups).omit({
    id: true,
    createdAt: true
});
exports.insertDocumentAnalysisSchema = (0, drizzle_zod_1.createInsertSchema)(exports.documentAnalysis).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertChatTranscriptSchema = (0, drizzle_zod_1.createInsertSchema)(exports.chatTranscripts).omit({
    id: true,
    createdAt: true
});
// Enhanced CRM Contact Management Tables
exports.contacts = (0, pg_core_1.pgTable)('contacts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).unique(),
    businessName: (0, pg_core_1.varchar)('business_name', { length: 255 }),
    craNumber: (0, pg_core_1.varchar)('cra_number', { length: 50 }),
    applicationId: (0, pg_core_1.uuid)('application_id').references(() => exports.applications.id),
    role: (0, pg_core_1.varchar)('role', { length: 50 }).default('Applicant'),
    companyName: (0, pg_core_1.varchar)('company_name', { length: 255 }),
    jobTitle: (0, pg_core_1.varchar)('job_title', { length: 100 }),
    source: (0, exports.leadSourceEnum)('source').default('application'),
    referralId: (0, pg_core_1.varchar)('referral_id', { length: 100 }), // For tracking partner referrals
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('active'),
    tenantId: (0, pg_core_1.uuid)('tenant_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.contactLogs = (0, pg_core_1.pgTable)('contact_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(), // 'sms' | 'call' | 'email' | 'note' | 'system'
    direction: (0, pg_core_1.varchar)('direction', { length: 20 }), // 'inbound' | 'outbound' | null
    content: (0, pg_core_1.text)('content').notNull(),
    staffUserId: (0, pg_core_1.uuid)('staff_user_id').references(() => exports.users.id),
    metadata: (0, pg_core_1.jsonb)('metadata'), // For storing additional data like call duration, SMS delivery status
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.notes = (0, pg_core_1.pgTable)('notes', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id),
    content: (0, pg_core_1.text)('content').notNull(),
    staffUserId: (0, pg_core_1.uuid)('staff_user_id').notNull().references(() => exports.users.id),
    pinned: (0, pg_core_1.boolean)('pinned').default(false),
    isPrivate: (0, pg_core_1.boolean)('is_private').default(false),
    tags: (0, pg_core_1.text)('tags').array(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
// Lender Management Tables
exports.lenders = (0, pg_core_1.pgTable)('lenders', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    companyName: (0, pg_core_1.varchar)('company_name', { length: 255 }).notNull(),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull(),
    phone: (0, pg_core_1.varchar)('phone', { length: 20 }),
    website: (0, pg_core_1.varchar)('website', { length: 500 }),
    description: (0, pg_core_1.text)('description'),
    regions: (0, pg_core_1.jsonb)('regions').$type().default([]),
    minAmount: (0, pg_core_1.integer)('min_amount'),
    maxAmount: (0, pg_core_1.integer)('max_amount'),
    minCreditScore: (0, pg_core_1.integer)('min_credit_score'),
    minTimeInBusinessMonths: (0, pg_core_1.integer)('min_time_in_business_months'),
    industries: (0, pg_core_1.jsonb)('industries').$type().default([]),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.lenderUsers = (0, pg_core_1.pgTable)('lender_users', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    lenderId: (0, pg_core_1.uuid)('lender_id').notNull().references(() => exports.lenders.id),
    email: (0, pg_core_1.varchar)('email', { length: 255 }).notNull().unique(),
    firstName: (0, pg_core_1.varchar)('first_name', { length: 100 }),
    lastName: (0, pg_core_1.varchar)('last_name', { length: 100 }),
    passwordHash: (0, pg_core_1.varchar)('password_hash', { length: 255 }).notNull(),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).notNull().default('active'),
    role: (0, pg_core_1.varchar)('role', { length: 50 }).notNull().default('lender'),
    permissions: (0, pg_core_1.jsonb)('permissions'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.lenderProducts = (0, pg_core_1.pgTable)('lender_products', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    lenderId: (0, pg_core_1.uuid)('lender_id').notNull().references(() => exports.lenders.id),
    name: (0, pg_core_1.varchar)('name', { length: 255 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    minAmount: (0, pg_core_1.integer)('min_amount'),
    maxAmount: (0, pg_core_1.integer)('max_amount'),
    interestRate: (0, pg_core_1.varchar)('interest_rate', { length: 50 }),
    termLength: (0, pg_core_1.varchar)('term_length', { length: 100 }),
    requirements: (0, pg_core_1.jsonb)('requirements'),
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
// Twilio Integration Tables
exports.callLogs = (0, pg_core_1.pgTable)('call_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    contactId: (0, pg_core_1.uuid)('contact_id').references(() => exports.contacts.id),
    staffUserId: (0, pg_core_1.uuid)('staff_user_id').references(() => exports.users.id),
    twilioCallSid: (0, pg_core_1.varchar)('twilio_call_sid', { length: 100 }),
    fromNumber: (0, pg_core_1.varchar)('from_number', { length: 20 }),
    toNumber: (0, pg_core_1.varchar)('to_number', { length: 20 }),
    status: (0, pg_core_1.varchar)('status', { length: 50 }), // initiated, ringing, answered, completed, failed
    direction: (0, pg_core_1.varchar)('direction', { length: 20 }), // inbound, outbound
    duration: (0, pg_core_1.integer)('duration'), // in seconds
    recordingUrl: (0, pg_core_1.varchar)('recording_url', { length: 500 }),
    startTime: (0, pg_core_1.timestamp)('start_time'),
    endTime: (0, pg_core_1.timestamp)('end_time'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
// Enhanced Voice System Tables
exports.calls = (0, pg_core_1.pgTable)('calls', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    providerCallSid: (0, pg_core_1.text)('provider_call_sid').unique(),
    isConference: (0, pg_core_1.boolean)('is_conference').notNull().default(false),
    conferenceSid: (0, pg_core_1.text)('conference_sid'),
    direction: (0, pg_core_1.text)('direction').notNull(),
    status: (0, pg_core_1.text)('status'),
    startedAt: (0, pg_core_1.timestamp)('started_at').defaultNow(),
    endedAt: (0, pg_core_1.timestamp)('ended_at'),
    meta: (0, pg_core_1.jsonb)('meta').notNull().default({})
});
exports.callParticipants = (0, pg_core_1.pgTable)('call_participants', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    callId: (0, pg_core_1.uuid)('call_id').notNull().references(() => exports.calls.id, { onDelete: 'cascade' }),
    contactId: (0, pg_core_1.uuid)('contact_id').notNull().references(() => exports.contacts.id, { onDelete: 'cascade' }),
    role: (0, pg_core_1.text)('role').notNull().default('participant')
});
exports.callRecordings = (0, pg_core_1.pgTable)('call_recordings', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    callId: (0, pg_core_1.uuid)('call_id').notNull().references(() => exports.calls.id, { onDelete: 'cascade' }),
    providerRecordingSid: (0, pg_core_1.text)('provider_recording_sid').unique(),
    providerUri: (0, pg_core_1.text)('provider_uri'),
    durationSec: (0, pg_core_1.integer)('duration_sec'),
    audioFormat: (0, pg_core_1.text)('audio_format'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
exports.callTranscripts = (0, pg_core_1.pgTable)('call_transcripts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    recordingId: (0, pg_core_1.uuid)('recording_id').notNull().references(() => exports.callRecordings.id, { onDelete: 'cascade' }),
    status: (0, pg_core_1.text)('status').notNull().default('queued'),
    language: (0, pg_core_1.text)('language').default('en'),
    text: (0, pg_core_1.text)('text'),
    summary: (0, pg_core_1.text)('summary'),
    error: (0, pg_core_1.text)('error'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.smsMessages = (0, pg_core_1.pgTable)('sms_messages', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    contactId: (0, pg_core_1.uuid)('contact_id').references(() => exports.contacts.id),
    staffUserId: (0, pg_core_1.uuid)('staff_user_id').references(() => exports.users.id),
    twilioMessageSid: (0, pg_core_1.varchar)('twilio_message_sid', { length: 100 }),
    fromNumber: (0, pg_core_1.varchar)('from_number', { length: 20 }),
    toNumber: (0, pg_core_1.varchar)('to_number', { length: 20 }),
    direction: (0, pg_core_1.varchar)('direction', { length: 20 }), // inbound, outbound
    body: (0, pg_core_1.text)('body'),
    status: (0, pg_core_1.varchar)('status', { length: 50 }), // sent, delivered, failed, received
    mediaUrls: (0, pg_core_1.text)('media_urls').array(),
    threadId: (0, pg_core_1.uuid)('thread_id'), // For grouping SMS conversations
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
// Microsoft Graph/Office 365 Integration Tables
exports.emailAccounts = (0, pg_core_1.pgTable)('email_accounts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    staffUserId: (0, pg_core_1.uuid)('staff_user_id').notNull().references(() => exports.users.id),
    microsoftId: (0, pg_core_1.varchar)('microsoft_id', { length: 255 }),
    emailAddress: (0, pg_core_1.varchar)('email_address', { length: 255 }).notNull(),
    displayName: (0, pg_core_1.varchar)('display_name', { length: 255 }),
    accessToken: (0, pg_core_1.text)('access_token'),
    refreshToken: (0, pg_core_1.text)('refresh_token'),
    tokenExpiresAt: (0, pg_core_1.timestamp)('token_expires_at'),
    isSharedMailbox: (0, pg_core_1.boolean)('is_shared_mailbox').default(false),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('active'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.emailThreads = (0, pg_core_1.pgTable)('email_threads', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    contactId: (0, pg_core_1.uuid)('contact_id').references(() => exports.contacts.id),
    subject: (0, pg_core_1.varchar)('subject', { length: 500 }),
    threadId: (0, pg_core_1.varchar)('thread_id', { length: 255 }), // Microsoft Graph thread ID
    lastMessageAt: (0, pg_core_1.timestamp)('last_message_at'),
    messageCount: (0, pg_core_1.integer)('message_count').default(0),
    isRead: (0, pg_core_1.boolean)('is_read').default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.emailMessages2 = (0, pg_core_1.pgTable)('email_messages2', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    threadId: (0, pg_core_1.uuid)('thread_id').references(() => exports.emailThreads.id),
    contactId: (0, pg_core_1.uuid)('contact_id').references(() => exports.contacts.id),
    staffUserId: (0, pg_core_1.uuid)('staff_user_id').references(() => exports.users.id),
    microsoftMessageId: (0, pg_core_1.varchar)('microsoft_message_id', { length: 255 }),
    fromAddress: (0, pg_core_1.varchar)('from_address', { length: 255 }),
    toAddresses: (0, pg_core_1.text)('to_addresses').array(),
    ccAddresses: (0, pg_core_1.text)('cc_addresses').array(),
    subject: (0, pg_core_1.varchar)('subject', { length: 500 }),
    body: (0, pg_core_1.text)('body'),
    bodyPreview: (0, pg_core_1.text)('body_preview'),
    direction: (0, pg_core_1.varchar)('direction', { length: 20 }), // inbound, outbound
    isRead: (0, pg_core_1.boolean)('is_read').default(false),
    hasAttachments: (0, pg_core_1.boolean)('has_attachments').default(false),
    importance: (0, pg_core_1.varchar)('importance', { length: 20 }).default('normal'),
    openTrackingPixelUrl: (0, pg_core_1.varchar)('open_tracking_pixel_url', { length: 500 }),
    openCount: (0, pg_core_1.integer)('open_count').default(0),
    firstOpenedAt: (0, pg_core_1.timestamp)('first_opened_at'),
    lastOpenedAt: (0, pg_core_1.timestamp)('last_opened_at'),
    sentAt: (0, pg_core_1.timestamp)('sent_at'),
    receivedAt: (0, pg_core_1.timestamp)('received_at'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
// Create insert schemas for new tables
exports.insertSiloSchema = (0, drizzle_zod_1.createInsertSchema)(exports.silos).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertContactSchema = (0, drizzle_zod_1.createInsertSchema)(exports.contacts).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertContactLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.contactLogs).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertNoteSchema = (0, drizzle_zod_1.createInsertSchema)(exports.notes).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertLenderUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.lenderUsers).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertLenderSchema = (0, drizzle_zod_1.createInsertSchema)(exports.lenders).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertLenderProductSchema = (0, drizzle_zod_1.createInsertSchema)(exports.lenderProducts).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertCallLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.callLogs).omit({
    id: true,
    createdAt: true
});
exports.insertCallSchema = (0, drizzle_zod_1.createInsertSchema)(exports.calls).omit({
    id: true,
    startedAt: true
});
exports.insertCallParticipantSchema = (0, drizzle_zod_1.createInsertSchema)(exports.callParticipants).omit({
    id: true
});
exports.insertCallRecordingSchema = (0, drizzle_zod_1.createInsertSchema)(exports.callRecordings).omit({
    id: true,
    createdAt: true
});
exports.insertCallTranscriptSchema = (0, drizzle_zod_1.createInsertSchema)(exports.callTranscripts).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertSmsMessageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.smsMessages).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertEmailAccountSchema = (0, drizzle_zod_1.createInsertSchema)(exports.emailAccounts).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertEmailThreadSchema = (0, drizzle_zod_1.createInsertSchema)(exports.emailThreads).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertEmailMessage2Schema = (0, drizzle_zod_1.createInsertSchema)(exports.emailMessages2).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// Office 365 Integration Table
exports.o365Tokens = (0, pg_core_1.pgTable)('o365_tokens', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id).unique(),
    accessToken: (0, pg_core_1.text)('access_token').notNull(),
    refreshToken: (0, pg_core_1.text)('refresh_token').notNull(),
    expiresAt: (0, pg_core_1.timestamp)('expires_at').notNull(),
    scope: (0, pg_core_1.text)('scope'),
    microsoftUserId: (0, pg_core_1.varchar)('microsoft_user_id', { length: 255 }),
    microsoftEmail: (0, pg_core_1.varchar)('microsoft_email', { length: 255 }),
    microsoftDisplayName: (0, pg_core_1.varchar)('microsoft_display_name', { length: 255 }),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.insertO365TokenSchema = (0, drizzle_zod_1.createInsertSchema)(exports.o365Tokens).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// Lead Sources Configuration Table - for multiple source support
exports.leadSources = (0, pg_core_1.pgTable)('lead_sources', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.varchar)('name', { length: 100 }).notNull(), // 'Main Line', 'Partner Referral', etc.
    sourceType: (0, exports.leadSourceEnum)('source_type').notNull(),
    twilioNumber: (0, pg_core_1.varchar)('twilio_number', { length: 20 }), // Associated phone number
    defaultRole: (0, exports.userRoleEnum)('default_role').default('staff'), // Role for users assigned to this source
    isActive: (0, pg_core_1.boolean)('is_active').default(true),
    referralIdRequired: (0, pg_core_1.boolean)('referral_id_required').default(false),
    webhookUrl: (0, pg_core_1.varchar)('webhook_url', { length: 500 }), // For API integrations
    metadata: (0, pg_core_1.jsonb)('metadata'), // Additional configuration
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.insertLeadSourceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.leadSources).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
// Deletion logs table for audit trail
exports.deletionLogs = (0, pg_core_1.pgTable)('deletion_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    entity: (0, pg_core_1.varchar)('entity', { length: 50 }).notNull(), // 'contact', 'application', 'document', etc.
    entityId: (0, pg_core_1.uuid)('entity_id').notNull(),
    deletedBy: (0, pg_core_1.uuid)('deleted_by').references(() => exports.users.id),
    reason: (0, pg_core_1.text)('reason'),
    metadata: (0, pg_core_1.jsonb)('metadata'), // Additional context about the deletion
    timestamp: (0, pg_core_1.timestamp)('timestamp').defaultNow(),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
// Chat related tables
exports.chatSessions = (0, pg_core_1.pgTable)('chat_sessions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sessionId: (0, pg_core_1.varchar)('session_id', { length: 255 }).notNull().unique(),
    userName: (0, pg_core_1.varchar)('user_name', { length: 255 }),
    userEmail: (0, pg_core_1.varchar)('user_email', { length: 255 }),
    userPhone: (0, pg_core_1.varchar)('user_phone', { length: 20 }),
    contactId: (0, pg_core_1.uuid)('contact_id').references(() => exports.contacts.id),
    applicationId: (0, pg_core_1.uuid)('application_id').references(() => exports.applications.id),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).notNull().default('waiting'),
    priority: (0, pg_core_1.varchar)('priority', { length: 20 }).default('normal'),
    assignedStaffId: (0, pg_core_1.uuid)('assigned_staff_id').references(() => exports.users.id),
    startedAt: (0, pg_core_1.timestamp)('started_at').defaultNow(),
    lastActivity: (0, pg_core_1.timestamp)('last_activity').defaultNow(),
    endedAt: (0, pg_core_1.timestamp)('ended_at'),
    tenantId: (0, pg_core_1.uuid)('tenant_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.chatMessages = (0, pg_core_1.pgTable)('chat_messages', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sessionId: (0, pg_core_1.uuid)('session_id').notNull().references(() => exports.chatSessions.id),
    role: (0, pg_core_1.varchar)('role', { length: 20 }).notNull(), // 'user', 'staff', 'assistant'
    message: (0, pg_core_1.text)('message').notNull(),
    userId: (0, pg_core_1.uuid)('user_id').references(() => exports.users.id),
    staffUserId: (0, pg_core_1.uuid)('staff_user_id').references(() => exports.users.id),
    metadata: (0, pg_core_1.jsonb)('metadata'), // For storing additional message data
    sentAt: (0, pg_core_1.timestamp)('sent_at').defaultNow(),
    tenantId: (0, pg_core_1.uuid)('tenant_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
// Communication logs table (matches actual database structure)
exports.communicationLogs = (0, pg_core_1.pgTable)('communication_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    contactId: (0, pg_core_1.uuid)('contact_id').references(() => exports.contacts.id),
    type: (0, pg_core_1.varchar)('type', { length: 50 }).notNull(),
    direction: (0, pg_core_1.varchar)('direction', { length: 50 }).notNull(),
    phoneNumber: (0, pg_core_1.varchar)('phone_number', { length: 50 }),
    content: (0, pg_core_1.text)('content'),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).default('pending'),
    source: (0, pg_core_1.text)('source').default('SLF'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.chatEscalations = (0, pg_core_1.pgTable)('chat_escalations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sessionId: (0, pg_core_1.varchar)('session_id', { length: 255 }).notNull(),
    userName: (0, pg_core_1.varchar)('user_name', { length: 255 }),
    userEmail: (0, pg_core_1.varchar)('user_email', { length: 255 }),
    message: (0, pg_core_1.text)('message'),
    escalationReason: (0, pg_core_1.varchar)('escalation_reason', { length: 100 }),
    applicationId: (0, pg_core_1.uuid)('application_id').references(() => exports.applications.id),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).notNull().default('pending'),
    assignedStaffId: (0, pg_core_1.uuid)('assigned_staff_id').references(() => exports.users.id),
    resolution: (0, pg_core_1.text)('resolution'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
exports.chatIssueReports = (0, pg_core_1.pgTable)('chat_issue_reports', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    sessionId: (0, pg_core_1.varchar)('session_id', { length: 255 }).notNull(),
    userName: (0, pg_core_1.varchar)('user_name', { length: 255 }),
    userEmail: (0, pg_core_1.varchar)('user_email', { length: 255 }),
    issueType: (0, pg_core_1.varchar)('issue_type', { length: 100 }).notNull(),
    description: (0, pg_core_1.text)('description'),
    severity: (0, pg_core_1.varchar)('severity', { length: 20 }).notNull().default('medium'),
    applicationId: (0, pg_core_1.uuid)('application_id').references(() => exports.applications.id),
    status: (0, pg_core_1.varchar)('status', { length: 50 }).notNull().default('open'),
    resolvedBy: (0, pg_core_1.uuid)('resolved_by').references(() => exports.users.id),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at').defaultNow()
});
// Recommendation Analytics Tables
exports.recommendationLogs = (0, pg_core_1.pgTable)('recommendation_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    applicantId: (0, pg_core_1.uuid)('applicant_id').notNull(),
    recommendedLenders: (0, pg_core_1.jsonb)('recommended_lenders'),
    rejectedLenders: (0, pg_core_1.jsonb)('rejected_lenders'),
    filtersApplied: (0, pg_core_1.jsonb)('filters_applied'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
// Audit Logs table for tracking all system actions
exports.auditLogs = (0, pg_core_1.pgTable)('audit_logs', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    entityType: (0, pg_core_1.varchar)('entity_type', { length: 50 }).notNull(), // 'application', 'document', 'user', etc.
    entityId: (0, pg_core_1.varchar)('entity_id', { length: 255 }).notNull(), // ID of the entity being tracked
    action: (0, pg_core_1.varchar)('action', { length: 100 }).notNull(), // 'stage_changed', 'document_uploaded', 'note_added', etc.
    details: (0, pg_core_1.text)('details'), // Human-readable description
    userId: (0, pg_core_1.varchar)('user_id', { length: 255 }), // Who performed the action
    metadata: (0, pg_core_1.jsonb)('metadata'), // Additional structured data
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow()
});
exports.passkeys = (0, pg_core_1.pgTable)('passkeys', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id').notNull().references(() => exports.users.id, { onDelete: 'cascade' }),
    credId: (0, pg_core_1.text)('cred_id').notNull().unique(),
    publicKey: (0, pg_core_1.text)('public_key').notNull(),
    counter: (0, pg_core_1.integer)('counter').notNull().default(0),
    deviceType: (0, pg_core_1.text)('device_type'),
    backedUp: (0, pg_core_1.boolean)('backed_up'),
    transports: (0, pg_core_1.text)('transports'), // JSON string
    label: (0, pg_core_1.text)('label').default('Passkey'),
    createdAt: (0, pg_core_1.timestamp)('created_at').defaultNow().notNull(),
    lastUsedAt: (0, pg_core_1.timestamp)('last_used_at').defaultNow().notNull(),
});
exports.insertChatSessionSchema = (0, drizzle_zod_1.createInsertSchema)(exports.chatSessions).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertChatMessageSchema = (0, drizzle_zod_1.createInsertSchema)(exports.chatMessages).omit({
    id: true,
    createdAt: true
});
exports.insertChatEscalationSchema = (0, drizzle_zod_1.createInsertSchema)(exports.chatEscalations).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertChatIssueReportSchema = (0, drizzle_zod_1.createInsertSchema)(exports.chatIssueReports).omit({
    id: true,
    createdAt: true,
    updatedAt: true
});
exports.insertRecommendationLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.recommendationLogs).omit({
    id: true,
    createdAt: true
});
exports.insertAuditLogSchema = (0, drizzle_zod_1.createInsertSchema)(exports.auditLogs).omit({
    id: true,
    createdAt: true
});
