// Extremely small in-memory shim for demo. Replace with your DB.
type Stage = "New"|"In Review"|"Requires Docs"|"Off to Lender"|"Accepted"|"Declined";
export type App = {
  id: string;
  businessName: string;
  contactId: string;
  contactPhone?: string;
  requestedAmount: number;
  stage: Stage;
  assignedLenderId?: string; // who we sent this to
  outcome?: "Accepted"|"Declined";
  fundedAmount?: number | null;
  updatedAt: string;
};

const _apps = new Map<string, App>();

// seed one
if (!_apps.size) {
  _apps.set("app-2", {
    id: "app-2",
    businessName: "Prairie Goods Ltd",
    contactId: "ct-1",
    contactPhone: "+15555550123",
    requestedAmount: 120000,
    stage: "Off to Lender",
    assignedLenderId: "l-1",
    updatedAt: new Date().toISOString()
  });
}

export const appsDb = {
  async listForLender(lenderId: string) {
    return Array.from(_apps.values()).filter(a => a.assignedLenderId === lenderId && a.stage === "Off to Lender");
  },
  async get(appId: string) { return _apps.get(appId) || null; },
  async update(appId: string, patch: Partial<App>) {
    const a = _apps.get(appId); if (!a) return null;
    const n = { ...a, ...patch, updatedAt: new Date().toISOString() };
    _apps.set(appId, n); return n;
  },
  // crude stats used by reports
  async listAllForLender(lenderId: string) { return Array.from(_apps.values()).filter(a => a.assignedLenderId === lenderId); }
};