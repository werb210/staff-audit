/**
 * Feature Contract System - Staff V2 CRM
 * Single source of truth for CRM Phase 1 features
 */

export interface FeatureContract {
  feature: string;
  apiEndpoint: string;
  hook: string;
  component: string;
  buttonOrUI: string;
  roles: string[];
  implemented: boolean;
}

export const FEATURE_CONTRACTS_PHASE_1: FeatureContract[] = [
  {
    feature: "Create Contact",
    apiEndpoint: "/api/crm/contacts [POST]",
    hook: "useCreateContact()",
    component: "ContactModal.tsx",
    buttonOrUI: "New Contact Button",
    roles: ["admin", "staff"],
    implemented: true
  },
  {
    feature: "Edit Contact",
    apiEndpoint: "/api/crm/contacts/:id [PATCH]",
    hook: "useUpdateContact()",
    component: "ContactModal.tsx",
    buttonOrUI: "Edit Contact Action",
    roles: ["admin", "staff"],
    implemented: true
  },
  {
    feature: "Delete Contact",
    apiEndpoint: "/api/crm/contacts/:id [DELETE]",
    hook: "useDeleteContact()",
    component: "ContactsTable.tsx",
    buttonOrUI: "Delete Contact Button",
    roles: ["admin"],
    implemented: true
  },
  {
    feature: "View Contacts",
    apiEndpoint: "/api/crm/contacts [GET]",
    hook: "useContacts()",
    component: "ContactsTable.tsx",
    buttonOrUI: "Contacts Tab View",
    roles: ["admin", "staff"],
    implemented: true
  },
  {
    feature: "Create Company",
    apiEndpoint: "/api/crm/companies [POST]",
    hook: "useCreateCompany()",
    component: "CompanyModal.tsx",
    buttonOrUI: "Add Company Button",
    roles: ["admin", "staff"],
    implemented: true
  },
  {
    feature: "View Deals",
    apiEndpoint: "/api/crm/deals [GET]",
    hook: "useCrmDeals()",
    component: "DealBoard.tsx",
    buttonOrUI: "Deals Tab",
    roles: ["admin", "staff"],
    implemented: true
  },
  {
    feature: "Create Task",
    apiEndpoint: "/api/crm/tasks [POST]",
    hook: "useCreateTask()",
    component: "TasksManager.tsx",
    buttonOrUI: "New Task Button",
    roles: ["admin", "staff"],
    implemented: true
  },
  {
    feature: "View Activity Feed",
    apiEndpoint: "/api/crm/activity [GET]",
    hook: "useActivityFeed()",
    component: "ActivityFeed.tsx",
    buttonOrUI: "Activity Tab",
    roles: ["admin", "staff"],
    implemented: true
  }
];

// PHASE 2: Marketing Features (7 features)
export const FEATURE_CONTRACTS_PHASE_2: FeatureContract[] = [
  {
    feature: "Email Marketing Campaign",
    apiEndpoint: "/api/marketing/campaigns [POST]",
    hook: "useCreateCampaign()",
    component: "CampaignModal.tsx",
    buttonOrUI: "Create Campaign Button",
    roles: ["admin", "staff", "marketing"],
    implemented: true
  },
  {
    feature: "Marketing Calendar",
    apiEndpoint: "/api/marketing/calendar [GET]",
    hook: "useMarketingCalendar()",
    component: "MarketingCalendar.tsx",
    buttonOrUI: "Calendar Tab View",
    roles: ["admin", "staff", "marketing"],
    implemented: true
  },
  {
    feature: "Social Media Publisher",
    apiEndpoint: "/api/marketing/social [POST]",
    hook: "useCreateSocialPost()",
    component: "SocialPostsTable.tsx",
    buttonOrUI: "Schedule Post Button",
    roles: ["admin", "staff", "marketing"],
    implemented: true
  },
  {
    feature: "SEO Audit Tool",
    apiEndpoint: "/api/marketing/seo [POST]",
    hook: "useCreateSeoReport()",
    component: "SeoReportsTable.tsx",
    buttonOrUI: "Run SEO Audit Button",
    roles: ["admin", "staff", "marketing"],
    implemented: true
  },
  {
    feature: "Marketing Lists Management",
    apiEndpoint: "/api/marketing/lists [POST]",
    hook: "useCreateMarketingList()",
    component: "MarketingListsTable.tsx",
    buttonOrUI: "Create List Button",
    roles: ["admin", "staff", "marketing"],
    implemented: true
  },
  {
    feature: "Ad Campaigns Manager",
    apiEndpoint: "/api/marketing/ads [POST]",
    hook: "useCreateAdCampaign()",
    component: "AdCampaignManager.tsx",
    buttonOrUI: "Create Ad Campaign Button",
    roles: ["admin", "staff", "marketing"],
    implemented: true
  },
  {
    feature: "Marketing Analytics",
    apiEndpoint: "/api/marketing/analytics [GET]",
    hook: "useMarketingAnalytics()",
    component: "MarketingReports.tsx",
    buttonOrUI: "Analytics Dashboard Tab",
    roles: ["admin", "staff", "marketing"],
    implemented: true
  }
];

// Combined contracts for validation
export const ALL_FEATURE_CONTRACTS = [
  ...FEATURE_CONTRACTS_PHASE_1,
  ...FEATURE_CONTRACTS_PHASE_2
];

// Utility functions for validation
export function getFeatureCompleteness(): { completed: number; total: number; percentage: number } {
  const completed = FEATURE_CONTRACTS_PHASE_1.filter(f => f.implemented === true).length;
  const total = FEATURE_CONTRACTS_PHASE_1.length;
  return {
    completed,
    total,
    percentage: Math.round((completed / total) * 100)
  };
}

export function getIncompleteFeatures(): FeatureContract[] {
  return FEATURE_CONTRACTS_PHASE_1.filter(f => f.implemented === false);
}

export function validateFeatureContract(featureName: string): boolean {
  const feature = FEATURE_CONTRACTS_PHASE_1.find(f => f.feature === featureName);
  if (!feature) return false;
  
  return feature.implemented === true;
}