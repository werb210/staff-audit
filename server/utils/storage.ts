type StoredFile = {
  filename: string;
  original_name: string;
  size: number;
  mime_type: string;
  path: string;
  uploaded_at: string;
};

type Application = {
  id: string;
  product_id: string;
  country: "CA"|"US";
  amount: number;
  years_in_business: number;
  monthly_revenue: number;
  business_legal_name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  documents: { type: string }[];
  status: "QUEUED"|"PROCESSING"|"SENT"|"FAILED";
  createdAt: string;
  updatedAt: string;
  files: StoredFile[]; // include files
};

// naive in-memory (replace with DB later)
const DB = new Map<string, Application>();

export async function saveApplication(data: Omit<Application,"id"|"status"|"createdAt"|"updatedAt"|"files">) {
  const id = `app_${Date.now()}_${Math.random().toString(36).slice(2,12)}`;
  const now = new Date().toISOString();
  DB.set(id, { id, ...data, status: "QUEUED", createdAt: now, updatedAt: now, files: [] });
  return id;
}

export async function getApplication(id: string) {
  return DB.get(id) || null;
}

export async function appendFiles(id: string, files: StoredFile[]) {
  const app = DB.get(id);
  if (!app) throw new Error("Application not found");
  app.files.push(...files);
  app.updatedAt = new Date().toISOString();
  DB.set(id, app);
}

export async function updateApplication(id: string, updates: Partial<Application>): Promise<void> {
  const existing = DB.get(id);
  if (existing) {
    DB.set(id, { ...existing, ...updates, updatedAt: new Date().toISOString() });
  }
}