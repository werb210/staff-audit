import { pool } from "../db/pool";
const q = pool.query.bind(pool);

export async function getContactMergeVars(contactId: string) {
  const [contact] = await q<any>(`
    SELECT id, first_name, last_name, business_legal_name, email, phone
    FROM contacts WHERE id=$1 LIMIT 1
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
      ClientPortalUrl: `${process.env.CLIENT_PORTAL_BASE}/login`
    };
  }

  // Pull missing/rejected documents for the most recent application by this contact
  const [application] = await q<any>(`
    SELECT a.id, a.created_at, a.stage
    FROM applications a
    WHERE a.contact_id=$1
    ORDER BY a.created_at DESC
    LIMIT 1
  `, [contactId]);

  let missingDocs: any[] = [];
  let rejectedDocs: any[] = [];
  if (application) {
    const docs = await q<any>(`
      SELECT id, document_type, status, file_name
      FROM documents
      WHERE application_id=$1
    `, [application.id]);
    
    missingDocs = docs.filter((x:any)=> x.status === "pending"); // pending but not accepted -> still missing
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
    MissingDocs: missingDocs.map((x:any)=>({ Id:x.id, Category:x.document_type, Filename:x.file_name })),
    RejectedDocsCount: rejectedDocs.length,
    RejectedDocs: rejectedDocs.map((x:any)=>({ Id:x.id, Category:x.document_type, Filename:x.file_name })),
    Now: new Date().toISOString(),
    ClientPortalUrl: `${process.env.CLIENT_PORTAL_BASE}/login`
  };
}

export function mergeVars(custom?: Record<string, any>, base?: Record<string, any>) {
  return { ...(base || {}), ...(custom || {}) };
}