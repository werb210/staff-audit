import { ApplicationCard, AppDocMeta, PipelineStage, StageTransition } from "../domain/pipeline";

const _apps = new Map<string, ApplicationCard>();
const _docs = new Map<string, AppDocMeta[]>();
const _transitions: StageTransition[] = [];

function now() { return new Date().toISOString(); }

// Add demo data
_apps.set("app-1", {
  id: "app-1",
  companyName: "Acme Corp",
  contactId: "contact-1",
  amountRequested: 50000,
  productCategory: "Term Loan",
  stage: "New",
  lastUpdatedAt: now(),
  likelihood: 85
});

_apps.set("app-2", {
  id: "app-2",
  companyName: "Tech Solutions Ltd",
  contactId: "contact-2",
  amountRequested: 25000,
  productCategory: "LOC",
  stage: "Requires Docs",
  lastUpdatedAt: now(),
  likelihood: 72
});

_apps.set("app-3", {
  id: "app-3",
  companyName: "Manufacturing Co",
  contactId: "contact-3",
  amountRequested: 100000,
  productCategory: "Equipment",
  stage: "In Review",
  lastUpdatedAt: now(),
  likelihood: 90
});

// Add demo docs
_docs.set("app-2", [
  {
    id: "doc-1",
    appId: "app-2",
    category: "Bank Statements",
    status: "uploaded",
    filename: "bank_statement_2024.pdf",
    s3Key: "docs/app-2/bank_statement_2024.pdf"
  },
  {
    id: "doc-2",
    appId: "app-2",
    category: "Tax Returns",
    status: "rejected",
    filename: "tax_return_2023.pdf",
    s3Key: "docs/app-2/tax_return_2023.pdf"
  }
]);

export const pipeline = {
  async list(): Promise<Record<PipelineStage, ApplicationCard[]>> {
    const by: Record<PipelineStage, ApplicationCard[]> = {
      "New":[], "Requires Docs":[], "In Review":[], "Ready for Lenders":[],
      "Sent to Lender":[], "Funded":[], "Closed":[]
    };
    for (const a of _apps.values()) by[a.stage].push(a);
    return by;
  },

  async get(appId: string) { return _apps.get(appId) || null; },

  async upsert(app: ApplicationCard) {
    _apps.set(app.id, { ...app, lastUpdatedAt: now() });
  },

  async move(appId: string, to: PipelineStage, reason?: string, actor?: string) {
    const app = _apps.get(appId);
    if (!app) throw new Error("not_found");
    const from = app.stage;
    app.stage = to; app.lastUpdatedAt = now();
    _apps.set(appId, app);
    _transitions.push({ appId, from, to, at: now(), reason, actor });
    return { from, to };
  },

  async docs(appId: string) { return _docs.get(appId) || []; },
  async setDocs(appId: string, docs: AppDocMeta[]) { _docs.set(appId, docs); },

  async setDocStatus(appId: string, docId: string, status:"accepted"|"rejected") {
    const docs = _docs.get(appId) || [];
    const d = docs.find(x => x.id === docId);
    if (d) d.status = status as any;
    _docs.set(appId, docs);
    return d;
  },

  async transitions(appId: string) { return _transitions.filter(t => t.appId === appId); }
};