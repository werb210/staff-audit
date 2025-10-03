import { pool } from "../db/pool";
const q = pool.query.bind(pool);

export async function getContactMergeVars(contactId: string, db?: any) {
  const execute = db?.execute || q;
  
  const [contact] = await execute(`
    SELECT id, first_name, last_name, business_legal_name, email, phone
    FROM contacts WHERE id = $1 LIMIT 1
  `, [contactId]);

  if (!contact) {
    return {
      ContactId: "",
      FirstName: "",
      LastName: "",
      BusinessName: "",
      ContactEmail: "",
      ContactPhone: "",
      ApplicationId: "",
      ApplicationStage: "",
      MissingDocsCount: 0,
      MissingDocs: [],
      RejectedDocsCount: 0,
      RejectedDocs: [],
      Now: new Date().toISOString(),
      ClientPortalUrl: `${process.env.CLIENT_PORTAL_BASE || 'https://portal.boreal.financial'}/login`
    };
  }

  // Pull missing/rejected documents for the most recent application by this contact
  const [application] = await execute(`
    SELECT a.id, a.created_at, a.stage
    FROM applications a
    WHERE a.contact_id = $1
    ORDER BY a.created_at DESC
    LIMIT 1
  `, [contactId]);

  let missingDocs: any[] = [];
  let rejectedDocs: any[] = [];
  if (application) {
    const docs = await execute(`
      SELECT id, category, status, filename
      FROM documents
      WHERE application_id = $1
    `, [application.id]);
    
    missingDocs = docs.filter((x:any)=> x.status === "uploaded"); // uploaded but not accepted -> still missing
    rejectedDocs = docs.filter((x:any)=> x.status === "rejected");
  }

  return {
    ContactId: contact.id,
    FirstName: contact.first_name || "",
    LastName: contact.last_name || "",
    BusinessName: contact.business_legal_name || "",
    ContactEmail: contact.email || "",
    ContactPhone: contact.phone || "",
    ApplicationId: application?.id || "",
    ApplicationStage: application?.stage || "",
    MissingDocsCount: missingDocs.length,
    MissingDocs: missingDocs.map((x:any)=>({ Id:x.id, Category:x.category, Filename:x.filename })),
    RejectedDocsCount: rejectedDocs.length,
    RejectedDocs: rejectedDocs.map((x:any)=>({ Id:x.id, Category:x.category, Filename:x.filename })),
    Now: new Date().toISOString(),
    ClientPortalUrl: `${process.env.CLIENT_PORTAL_BASE || 'https://portal.boreal.financial'}/login`
  };
}

export function mergeVars(custom?: Record<string, any>, base?: Record<string, any>) {
  return { ...(base || {}), ...(custom || {}) };
}

export function renderTemplate(template: string, vars: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, String(value || ''));
  }
  return result;
}