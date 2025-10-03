// Type-safe route manifest - Single source of truth for API bases
export const API = {
  tasks: "/api/tasks",
  calendar: "/api/calendar", 
  comm: "/api/comm",
  lenders: "/api/lenders",
  lenderProducts: "/api/lender-products",
  lenderProductsEnhanced: "/api/lender-products-enhanced",
  contacts: "/api/contacts",
  pipeline: "/api/pipeline",
  marketing: "/api/marketing",
  reports: "/api/reports",
  users: "/api/users",
  integrations: "/api/integrations",
  dashboard: "/api/dashboard",
  notes: "/api/notes",
  verify: "/api/verify",
  lookup: "/api/lookup",
  twilioLookup: "/api/twilio/lookup",
  twilioVerify: "/api/twilio/verify",
  webhooks: "/api/webhooks",
  ops: "/api/ops",
  health: "/api/health",
  applications: "/api/applications",
  documents: "/api/documents",
  rbac: "/api/rbac",
  voice: "/api/voice",
  sms: "/api/sms",
  email: "/api/email",
  approvals: "/api/approvals",
  bulk: "/api/bulk",
  crud: "/api/crud"
} as const;

export type ApiBase = (typeof API)[keyof typeof API];

// Portal routes
export const PORTALS = {
  lenderPortal: "/lender-portal",
  staff: "/staff", 
  staffSlf: "/staff/slf"
} as const;

export type PortalBase = (typeof PORTALS)[keyof typeof PORTALS];