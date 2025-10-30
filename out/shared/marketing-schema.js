/**
 * Marketing System Database Schema
 * Supports: Campaigns, Sequences, Attribution, Audiences, Office 365
 */
import { pgTable, text, uuid, timestamp, integer, numeric, json, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
// Marketing Campaigns
export const marketingCampaigns = pgTable("marketing_campaigns", {
    id: uuid("id").primaryKey().defaultRandom(),
    platform: text("platform").notNull(), // "google", "linkedin", "twitter", "tiktok", "facebook", "youtube"
    name: text("name").notNull(),
    campaignId: text("campaign_id"), // External platform campaign ID
    status: text("status").default("active"), // active, paused, completed
    objective: text("objective"), // conversions, traffic, awareness
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    dailyBudget: numeric("daily_budget"),
    totalSpend: numeric("total_spend").default("0"),
    clicks: integer("clicks").default(0),
    impressions: integer("impressions").default(0),
    conversions: integer("conversions").default(0),
    cpa: numeric("cpa"), // Cost per acquisition
    roas: numeric("roas"), // Return on ad spend
    contactId: uuid("contact_id"), // Contact that converted from this campaign
    targetingData: json("targeting_data"), // Platform-specific targeting
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});
// Marketing Sequences (Email, SMS, LinkedIn)
export const marketingSequences = pgTable("marketing_sequences", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: text("type").notNull(), // "email", "sms", "linkedin"
    steps: json("steps").notNull(), // Array of sequence steps
    contactIds: json("contact_ids"), // Array of contact UUIDs
    status: text("status").default("draft"), // draft, active, paused, completed
    totalContacts: integer("total_contacts").default(0),
    completedContacts: integer("completed_contacts").default(0),
    openRate: numeric("open_rate"),
    clickRate: numeric("click_rate"),
    replyRate: numeric("reply_rate"),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});
// Sequence Execution Logs
export const sequenceLogs = pgTable("sequence_logs", {
    id: uuid("id").primaryKey().defaultRandom(),
    sequenceId: uuid("sequence_id").notNull(),
    contactId: uuid("contact_id").notNull(),
    stepIndex: integer("step_index").notNull(),
    stepType: text("step_type").notNull(), // email, sms, linkedin, delay, wait
    status: text("status").notNull(), // pending, sent, delivered, opened, clicked, replied, failed
    message: text("message"), // Sent message content
    templateId: uuid("template_id"), // Reference to template if used
    scheduledAt: timestamp("scheduled_at"),
    executedAt: timestamp("executed_at"),
    metadata: json("metadata"), // Platform-specific data
    error: text("error"), // Error message if failed
    createdAt: timestamp("created_at").defaultNow()
});
// Retargeting Audiences
export const retargetingAudiences = pgTable("retargeting_audiences", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    description: text("description"),
    source: text("source").notNull(), // "email_opened", "ad_clicked", "abandoned_app", "manual"
    platform: text("platform").notNull(), // "google", "facebook", "linkedin", "twitter"
    contactIds: json("contact_ids"), // Array of contact UUIDs
    filters: json("filters"), // CRM filter criteria
    audienceId: text("audience_id"), // External platform audience ID
    syncStatus: text("sync_status").default("pending"), // pending, syncing, synced, failed
    lastSyncAt: timestamp("last_sync_at"),
    totalContacts: integer("total_contacts").default(0),
    matchRate: numeric("match_rate"), // Percentage of contacts matched by platform
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});
// Attribution Tracking
export const attributionEvents = pgTable("attribution_events", {
    id: uuid("id").primaryKey().defaultRandom(),
    contactId: uuid("contact_id").notNull(),
    applicationId: uuid("application_id"),
    eventType: text("event_type").notNull(), // click, view, conversion, form_start, form_submit
    source: text("source").notNull(), // google, linkedin, facebook, youtube, twitter, tiktok, email, sms
    medium: text("medium"), // cpc, social, email, organic
    campaign: text("campaign"),
    content: text("content"),
    term: text("term"),
    gclid: text("gclid"), // Google Click ID
    gbraid: text("gbraid"), // Google view-through ID
    fbclid: text("fbclid"), // Facebook Click ID
    liClickId: text("li_click_id"), // LinkedIn Click ID
    utmSource: text("utm_source"),
    utmMedium: text("utm_medium"),
    utmCampaign: text("utm_campaign"),
    utmContent: text("utm_content"),
    utmTerm: text("utm_term"),
    value: numeric("value"), // Conversion value
    revenue: numeric("revenue"), // Revenue generated
    eventTime: timestamp("event_time").defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: json("metadata") // Additional platform-specific data
});
// Office 365 Integration
export const o365Tokens = pgTable("o365_tokens", {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    scope: text("scope"), // Granted permissions
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});
export const o365CalendarEvents = pgTable("o365_calendar_events", {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: text("event_id").notNull(), // Microsoft Graph event ID
    userId: uuid("user_id").notNull(),
    contactId: uuid("contact_id"), // CRM contact if applicable
    subject: text("subject"),
    body: text("body"),
    start: timestamp("start"),
    end: timestamp("end"),
    location: text("location"),
    attendees: json("attendees"), // Array of attendee objects
    isAllDay: boolean("is_all_day").default(false),
    status: text("status"), // free, busy, tentative, outOfOffice
    importance: text("importance"), // low, normal, high
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});
export const o365EmailThreads = pgTable("o365_email_threads", {
    id: uuid("id").primaryKey().defaultRandom(),
    threadId: text("thread_id").notNull(), // Microsoft Graph conversation ID
    contactId: uuid("contact_id").notNull(),
    subject: text("subject"),
    participants: json("participants"), // Array of email addresses
    messageCount: integer("message_count").default(0),
    lastMessage: text("last_message"),
    lastMessageTime: timestamp("last_message_time"),
    isRead: boolean("is_read").default(false),
    importance: text("importance"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});
// LinkedIn Messaging (Custom System)
export const linkedinMessages = pgTable("linkedin_messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    sequenceId: uuid("sequence_id"),
    contactId: uuid("contact_id").notNull(),
    linkedinProfileUrl: text("linkedin_profile_url"),
    messageType: text("message_type").notNull(), // connection_request, message, inmail
    subject: text("subject"),
    content: text("content").notNull(),
    status: text("status").default("pending"), // pending, sent, replied, failed
    sentAt: timestamp("sent_at"),
    replyReceived: boolean("reply_received").default(false),
    replyContent: text("reply_content"),
    replyAt: timestamp("reply_at"),
    notes: text("notes"), // Staff notes
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});
// Marketing Templates
export const marketingTemplates = pgTable("marketing_templates", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    type: text("type").notNull(), // email, sms, linkedin_connection, linkedin_message
    subject: text("subject"), // For email/LinkedIn messages
    content: text("content").notNull(),
    variables: json("variables"), // Available merge variables
    category: text("category"), // follow_up, introduction, promotional, etc.
    isActive: boolean("is_active").default(true),
    usage_count: integer("usage_count").default(0),
    createdBy: uuid("created_by"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow()
});
// Campaign Performance Metrics
export const campaignMetrics = pgTable("campaign_metrics", {
    id: uuid("id").primaryKey().defaultRandom(),
    campaignId: uuid("campaign_id").notNull(),
    platform: text("platform").notNull(),
    date: timestamp("date").notNull(),
    impressions: integer("impressions").default(0),
    clicks: integer("clicks").default(0),
    spend: numeric("spend").default("0"),
    conversions: integer("conversions").default(0),
    revenue: numeric("revenue").default("0"),
    ctr: numeric("ctr"), // Click-through rate
    cpc: numeric("cpc"), // Cost per click
    cpa: numeric("cpa"), // Cost per acquisition
    roas: numeric("roas"), // Return on ad spend
    createdAt: timestamp("created_at").defaultNow()
});
// Zod schemas for validation
export const insertMarketingCampaignSchema = createInsertSchema(marketingCampaigns);
export const insertMarketingSequenceSchema = createInsertSchema(marketingSequences);
export const insertSequenceLogSchema = createInsertSchema(sequenceLogs);
export const insertRetargetingAudienceSchema = createInsertSchema(retargetingAudiences);
export const insertAttributionEventSchema = createInsertSchema(attributionEvents);
export const insertO365TokenSchema = createInsertSchema(o365Tokens);
export const insertO365CalendarEventSchema = createInsertSchema(o365CalendarEvents);
export const insertO365EmailThreadSchema = createInsertSchema(o365EmailThreads);
export const insertLinkedinMessageSchema = createInsertSchema(linkedinMessages);
export const insertMarketingTemplateSchema = createInsertSchema(marketingTemplates);
export const insertCampaignMetricSchema = createInsertSchema(campaignMetrics);
