import fs from "fs";
import path from "path";
const STORE_FILE = path.join(process.cwd(), "reports", "communications-store.json");
function generateId(prefix = "comm_") {
    return prefix + Math.random().toString(36).slice(2, 10);
}
function loadStore() {
    try {
        return JSON.parse(fs.readFileSync(STORE_FILE, "utf8"));
    }
    catch {
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
function saveStore(store) {
    fs.mkdirSync(path.dirname(STORE_FILE), { recursive: true });
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}
export const communicationsDB = {
    // Templates
    listTemplates() {
        return loadStore().templates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    getTemplate(id) {
        return loadStore().templates.find(t => t.id === id);
    },
    upsertTemplate(template) {
        const store = loadStore();
        const now = new Date().toISOString();
        if (!template.id) {
            const newTemplate = {
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
        if (index < 0)
            throw new Error("Template not found");
        store.templates[index] = {
            ...store.templates[index],
            ...template,
            updatedAt: now
        };
        saveStore(store);
        return store.templates[index];
    },
    deleteTemplate(id) {
        const store = loadStore();
        store.templates = store.templates.filter(t => t.id !== id);
        saveStore(store);
    },
    // Communications
    addCommunication(comm) {
        const store = loadStore();
        const now = new Date().toISOString();
        const newComm = {
            ...comm,
            id: generateId("comm_"),
            createdAt: now,
            updatedAt: now
        };
        store.communications.push(newComm);
        saveStore(store);
        return newComm;
    },
    updateCommunication(id, updates) {
        const store = loadStore();
        const index = store.communications.findIndex(c => c.id === id);
        if (index < 0)
            throw new Error("Communication not found");
        store.communications[index] = {
            ...store.communications[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        saveStore(store);
        return store.communications[index];
    },
    getCommunication(id) {
        return loadStore().communications.find(c => c.id === id);
    },
    listCommunications(contactId) {
        return loadStore().communications
            .filter(c => c.contactId === contactId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    deleteCommunication(id) {
        const store = loadStore();
        store.communications = store.communications.filter(c => c.id !== id);
        saveStore(store);
    },
    // Tracking
    addTracking(tracking) {
        const store = loadStore();
        const newTracking = {
            ...tracking,
            id: generateId("trk_"),
            createdAt: new Date().toISOString()
        };
        store.tracking.push(newTracking);
        saveStore(store);
        return newTracking;
    },
    getTrackingForComm(commId) {
        return loadStore().tracking.filter(t => t.commId === commId);
    },
    // Email Settings
    getEmailSettings() {
        return loadStore().emailSettings;
    },
    updateEmailSettings(updates) {
        const store = loadStore();
        store.emailSettings = { ...store.emailSettings, ...updates };
        saveStore(store);
        return store.emailSettings;
    }
};
export function getCommunicationStats(commId) {
    const tracking = communicationsDB.getTrackingForComm(commId);
    return {
        opens: tracking.filter(t => t.kind === "open").length,
        clicks: tracking.filter(t => t.kind === "click").length
    };
}
