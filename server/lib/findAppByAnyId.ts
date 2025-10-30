import { q } from '../lib/db';
import { sql } from 'drizzle-orm';

export async function findAppByAnyId(id: string) {
  try {
    console.log(`🔍 [FIND-APP] Looking up application: ${id}`);
    
    // Get application with form data (using existing query pattern)
    const appQuery = `
      SELECT 
        id,
        form_data,
        status,
        createdAt,
        requested_amount,
        contact_first_name,
        contact_last_name, 
        contact_email,
        contact_phone,
        use_of_funds,
        business_email,
        legal_business_name,
        dba_name,
        years_in_business
      FROM applications 
      WHERE id = $1
      LIMIT 1
    `;
    
    const appResult = await q(appQuery, [id]);
    if (!appResult?.rows || appResult.rows.length === 0) {
      console.log(`❌ [FIND-APP] Application not found: ${id}`);
      return null;
    }

    const application = appResult.rows[0] as any;
    const formData = application.form_data || {};

    // Get associated documents
    const docsQuery = `
      SELECT 
        id,
        name,
        document_type,
        status,
        createdAt
      FROM documents 
      WHERE applicationId = $1
    `;
    
    const docsResult = await q(docsQuery, [id]);
    const documents = docsResult?.rows || [];

    // Extract contact info (prioritize database fields over form_data)
    const contact = {
      name: application.contact_first_name && application.contact_last_name 
        ? `${application.contact_first_name} ${application.contact_last_name}`
        : formData.step1?.contactName || formData.step2?.contactName || 'Unknown Contact',
      email: application.contact_email || formData.step1?.contactEmail || formData.step2?.contactEmail,
      phone: application.contact_phone || formData.step1?.contactPhone || formData.step2?.contactPhone,
    };

    // Extract business info
    const businessName = application.legal_business_name || 
                        application.dba_name ||
                        formData.step1?.businessName || 
                        formData.step2?.businessName || 
                        `Application ${id.slice(0, 8)}`;

    const useOfFunds = application.use_of_funds ||
                     formData.step1?.useOfFunds || 
                     formData.step2?.useOfFunds || 
                     formData.step1?.loanPurpose ||
                     'Not specified';

    console.log(`✅ [FIND-APP] Found application with ${documents.length} documents, contact: ${contact.name}`);

    return {
      id: application.id,
      createdAt: application.createdAt,
      status: application.status,
      requestedAmount: application.requested_amount,
      formData: formData,
      documents: documents,
      contact: contact,
      useOfFunds: useOfFunds,
      businessName: businessName,
      industry: formData.step2?.industry || formData.step3?.industry || 'Other',
    };
  } catch (error) {
    console.error('Error finding application by ID:', error);
    return null;
  }
}