export const uiCoverageManifest = [
    // OTP (Twilio Verify)
    { label: "OTP Request", method: "POST", path: "/api/otp/request", uiPath: "/login", selector: "[data-testid='btn-continue']" },
    { label: "OTP Verify", method: "POST", path: "/api/otp/verify", uiPath: "/login", selector: "[data-testid='btn-verify']" },
    // OTP Diagnostics (admin tools)
    { label: "OTP Diag Health", method: "GET", path: "/api/otp/diag/health", uiPath: "/admin/tools", selector: "[data-testid='btn-otp-health']", adminOnly: true },
    { label: "OTP Diag Send", method: "POST", path: "/api/otp/diag/send", uiPath: "/admin/tools", selector: "[data-testid='btn-otp-send']", adminOnly: true },
    { label: "OTP Diag Logs", method: "GET", path: "/api/otp/diag/last?mins=10", uiPath: "/admin/tools", selector: "[data-testid='btn-otp-logs']", adminOnly: true },
    // Authentication
    { label: "User Login", method: "POST", path: "/api/auth/login", uiPath: "/login", selector: "[data-testid='btn-continue']" },
    { label: "Get User", method: "GET", path: "/api/auth/user", uiPath: "/app", selector: "[data-testid='user-profile']" },
    // Applications
    { label: "Create Application", method: "POST", path: "/api/applications", uiPath: "/app/applications", selector: "[data-testid='btn-create-application']" },
    { label: "Get Applications", method: "GET", path: "/api/applications", uiPath: "/app/applications", selector: "[data-testid='applications-list']" },
    // Documents
    { label: "Upload Document", method: "POST", path: "/api/documents/upload", uiPath: "/app/documents", selector: "[data-testid='btn-upload-document']" },
    { label: "Get Documents", method: "GET", path: "/api/documents", uiPath: "/app/documents", selector: "[data-testid='documents-list']" },
    // Lender Products
    { label: "Get Lender Products", method: "GET", path: "/api/lender-products-real", uiPath: "/app/lenders", selector: "[data-testid='lender-products-list']" },
    { label: "Lender Recommendations", method: "POST", path: "/api/lender-recommendations/recommend", uiPath: "/app/applications/:id", selector: "[data-testid='btn-get-recommendations']" },
    // Communications
    { label: "Send Template", method: "POST", path: "/api/messages/send-template", uiPath: "/app/communications/templates", selector: "[data-testid='btn-send-template']" },
    { label: "Start Conversation", method: "POST", path: "/api/conversations/create-or-attach", uiPath: "/app/communications/threads", selector: "[data-testid='btn-start-convo']" },
    // Voice & Conference
    { label: "Voice Call", method: "POST", path: "/api/voice/call", uiPath: "/app/communications/voice", selector: "[data-testid='btn-make-call']" },
    { label: "Conference Create", method: "POST", path: "/api/conference/create", uiPath: "/app/communications/conference", selector: "[data-testid='btn-create-conference']" },
    // Office 365 — Email
    { label: "Email Send", method: "POST", path: "/api/o365/email/send", uiPath: "/app/communications/email", selector: "[data-testid='btn-email-send']" },
    { label: "Inbox Sync", method: "POST", path: "/api/o365/email/sync-inbox", uiPath: "/app/communications/email", selector: "[data-testid='btn-inbox-sync']" },
    // Office 365 — Calendar
    { label: "Calendar Push", method: "POST", path: "/api/o365/calendar/push", uiPath: "/app/calendar", selector: "[data-testid='btn-calendar-save']" },
    { label: "Calendar Pull", method: "POST", path: "/api/o365/calendar/pull", uiPath: "/app/calendar", selector: "[data-testid='btn-calendar-refresh']" },
    { label: "Create Teams Meeting", method: "POST", path: "/api/o365/calendar/teams-meeting", uiPath: "/app/calendar", selector: "[data-testid='btn-create-teams']" },
    // Office 365 — Tasks
    { label: "Tasks Push", method: "POST", path: "/api/o365/tasks/push", uiPath: "/app/tasks", selector: "[data-testid='btn-task-sync-up']" },
    { label: "Tasks Pull", method: "POST", path: "/api/o365/tasks/pull", uiPath: "/app/tasks", selector: "[data-testid='btn-task-sync-down']" },
    // Office 365 — Contacts
    { label: "Contact Push", method: "POST", path: "/api/o365/contacts/push", uiPath: "/app/contacts/:id", selector: "[data-testid='btn-contact-sync-up']" },
    { label: "Contacts Import", method: "POST", path: "/api/o365/contacts/pull", uiPath: "/app/contacts", selector: "[data-testid='btn-contacts-import']" },
    // Office 365 — Teams Chat
    { label: "Teams Send", method: "POST", path: "/api/o365/chat/send", uiPath: "/app/communications/teams", selector: "[data-testid='btn-teams-send']" },
    { label: "Teams Presence", method: "POST", path: "/api/o365/chat/presence", uiPath: "/app/contacts/:id", selector: "[data-testid='presence-indicator']" }
];
