// naive in-memory (replace with DB later)
const DB = new Map();
export async function saveApplication(data) {
    const id = `app_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    const now = new Date().toISOString();
    DB.set(id, { id, ...data, status: "QUEUED", createdAt: now, updatedAt: now, files: [] });
    return id;
}
export async function getApplication(id) {
    return DB.get(id) || null;
}
export async function appendFiles(id, files) {
    const app = DB.get(id);
    if (!app)
        throw new Error("Application not found");
    app.files.push(...files);
    app.updatedAt = new Date().toISOString();
    DB.set(id, app);
}
export async function updateApplication(id, updates) {
    const existing = DB.get(id);
    if (existing) {
        DB.set(id, { ...existing, ...updates, updatedAt: new Date().toISOString() });
    }
}
