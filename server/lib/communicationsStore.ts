import fs from "fs";
import path from "path";

type Id = string;

export type Template = {
  id: Id;
  name: string;
  subject: string;
  html: string;
  updatedAt: string;
  createdAt: string;
};

export type Communication = {
  id: Id;
  contactId: Id;
  type: "sms" | "call" | "email";
  direction: "inbound" | "outbound";
  subject?: string;
  body?: string;
  status?: string;
  meta?: any;
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Tracking = {
  id: Id;
  kind: "open" | "click";
  commId: Id;
  createdAt: string;
  url?: string;
  ua?: string;
  ip?: string;
};

export type EmailSettings = {
  fromDefault?: string;
  signatureHtml?: string;
  trackingEnabled?: boolean;
};

export type CommunicationsStore = {
  templates: Template[];
  communications: Communication[];
  tracking: Tracking[];
  emailSettings: EmailSettings;
};

const STORE_FILE = path.join(process.cwd(), "reports", "communications-store.json");

function generateId(prefix = "comm_"): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

function loadStore(): CommunicationsStore {
  try {
    return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
  } catch {
    return {
      templates: [],
      communications: [],
      tracking: [],
      emailSettings: {
        fromDefault: process.env.EMAIL_FROM_FALLBACK || "no-reply@boreal.financial",
        signatureHtml: "<p>Best regards,<br/>Boreal Financial Team</p>",
        trackingEnabled: true
      }
    };
  }
}

function saveStore(store: CommunicationsStore): void {
  fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
  fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

export const communicationsDB = {
  // Templates
  listTemplates(): Template[] {
    return loadStore().templates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  },

  getTemplate(id: Id): Template | undefined {
    return loadStore().templates.find(t => t.id === id);
  },

  upsertTemplate(template: Partial<Template> & { name: string; subject: string; html: string }): Template {
    const store = loadStore();
    const now = new Date().toISOString();
    
    if (!template.id) {
      const newTemplate: Template = {
        id: generateId("tpl_"),
        name: template.name,
        subject: template.subject,
        html: template.html,
        createdAt: now,
        updatedAt: now
      };
      store.templates.push(newTemplate);
      saveStore(store);
      return newTemplate;
    }
    
    const index = store.templates.findIndex(t => t.id === template.id);
    if (index < 0) throw new Error("Template not found");
    
    store.templates[index] = {
      ...store.templates[index],
      ...template,
      updatedAt: now
    };
    saveStore(store);
    return store.templates[index];
  },

  deleteTemplate(id: Id): void {
    const store = loadStore();
    store.templates = store.templates.filter(t => t.id !== id);
    saveStore(store);
  },

  // Communications
  addCommunication(comm: Omit<Communication, "id" | "createdAt" | "updatedAt">): Communication {
    const store = loadStore();
    const now = new Date().toISOString();
    const newComm: Communication = {
      ...comm,
      id: generateId("comm_"),
      createdAt: now,
      updatedAt: now
    };
    store.communications.push(newComm);
    saveStore(store);
    return newComm;
  },

  updateCommunication(id: Id, updates: Partial<Communication>): Communication {
    const store = loadStore();
    const index = store.communications.findIndex(c => c.id === id);
    if (index < 0) throw new Error("Communication not found");
    
    store.communications[index] = {
      ...store.communications[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveStore(store);
    return store.communications[index];
  },

  getCommunication(id: Id): Communication | undefined {
    return loadStore().communications.find(c => c.id === id);
  },

  listCommunications(contactId: Id): Communication[] {
    return loadStore().communications
      .filter(c => c.contactId === contactId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  deleteCommunication(id: Id): void {
    const store = loadStore();
    store.communications = store.communications.filter(c => c.id !== id);
    saveStore(store);
  },

  // Tracking
  addTracking(tracking: Omit<Tracking, "id" | "createdAt">): Tracking {
    const store = loadStore();
    const newTracking: Tracking = {
      ...tracking,
      id: generateId("trk_"),
      createdAt: new Date().toISOString()
    };
    store.tracking.push(newTracking);
    saveStore(store);
    return newTracking;
  },

  getTrackingForComm(commId: Id): Tracking[] {
    return loadStore().tracking.filter(t => t.commId === commId);
  },

  // Email Settings
  getEmailSettings(): EmailSettings {
    return loadStore().emailSettings;
  },

  updateEmailSettings(updates: Partial<EmailSettings>): EmailSettings {
    const store = loadStore();
    store.emailSettings = { ...store.emailSettings, ...updates };
    saveStore(store);
    return store.emailSettings;
  }
};

export function getCommunicationStats(commId: Id) {
  const tracking = communicationsDB.getTrackingForComm(commId);
  return {
    opens: tracking.filter(t => t.kind === "open").length,
    clicks: tracking.filter(t => t.kind === "click").length
  };
}