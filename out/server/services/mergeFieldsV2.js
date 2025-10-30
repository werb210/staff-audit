import { pool } from "../db/pool";
const q = pool.query.bind(pool);
export async function getContactMergeVars(contactId) {
    const [contact] = await q(`
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
    const [application] = await q(`
    SELECT a.id, a.createdAt, a.stage
    FROM applications a
    WHERE a.contact_id=$1
    ORDER BY a.createdAt DESC
    LIMIT 1
  `, [contactId]);
    let missingDocs = [];
    let rejectedDocs = [];
    if (application) {
        const docs = await q(`
      SELECT id, document_type, status, name
      FROM documents
      WHERE applicationId=$1
    `, [application.id]);
        missingDocs = docs.filter((x) => x.status === "pending"); // pending but not accepted -> still missing
        rejectedDocs = docs.filter((x) => x.status === "rejected");
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
        MissingDocs: missingDocs.map((x) => ({ Id: x.id, Category: x.document_type, Filename: x.name })),
        RejectedDocsCount: rejectedDocs.length,
        RejectedDocs: rejectedDocs.map((x) => ({ Id: x.id, Category: x.document_type, Filename: x.name })),
        Now: new Date().toISOString(),
        ClientPortalUrl: `${process.env.CLIENT_PORTAL_BASE}/login`
    };
}
export function mergeVars(custom, base) {
    return { ...(base || {}), ...(custom || {}) };
}
