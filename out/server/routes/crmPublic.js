import { Router } from "express";
const crmPublicRouter = Router();
// 🚨 DEPRECATED: This route uses legacy crm_contacts table
// TODO: Migrate to unified CRM system using /api/contacts and crmService.ts
crmPublicRouter.post("/contacts/auto-create", async (req, res) => {
    console.warn('🚨 [DEPRECATED] Legacy crm_contacts route accessed - use unified CRM service instead');
    try {
        // Return deprecation warning instead of creating contacts
        return res.status(410).json({
            error: "DEPRECATED_ROUTE",
            message: "This route is deprecated. Use the unified CRM system instead.",
            replacement: "/api/contacts with autoCreateContactsFromApplication() service",
            timestamp: new Date().toISOString()
        });
        /* DEPRECATED CODE - COMMENTED OUT FOR REFERENCE
        const { name, email, phone, firstName, lastName, source = "client_portal", applicationId } = req.body;
        
        if (!email) {
          return res.status(400).json({ error: "Missing email" });
        }
    
        // Check for existing contact by email using raw SQL
        const existingCheck = await db.execute(sql`
          SELECT id, first_name, last_name, email, phone, source, status
          FROM crm_contacts
          WHERE email = ${email.toLowerCase()}
          LIMIT 1
        `);
        
        if (existingCheck.rows.length > 0) {
          console.log(`[CRM PUBLIC] Existing contact found: ${email}`);
          return res.json({ status: "exists", contact: existingCheck.rows[0] });
        }
    
        // Create new contact using raw SQL
        const insertResult = await db.execute(sql`
          INSERT INTO crm_contacts (first_name, last_name, email, phone, source, status)
          VALUES (
            ${firstName || name?.split(' ')[0] || ''},
            ${lastName || name?.split(' ').slice(1).join(' ') || ''},
            ${email.toLowerCase()},
            ${phone || ''},
            ${source},
            'active'
          )
          RETURNING id, first_name, last_name, email, phone, source, status
        `);
    
        const newContact = insertResult.rows[0];
        console.log(`[CRM PUBLIC] New contact created: ${email} (ID: ${newContact.id})`);
        
        // Log activity if applicationId provided
        if (applicationId) {
          console.log(`[CRM PUBLIC] Contact linked to application: ${applicationId}`);
        }
    
        return res.status(201).json({
          status: "created",
          contact: newContact,
          message: "Contact created successfully via client portal"
        });
        */
    }
    catch (error) {
        console.error('[CRM PUBLIC] Error in deprecated route:', error);
        return res.status(500).json({
            error: "Failed to process deprecated route",
            details: error instanceof Error ? error.message : String(error)
        });
    }
});
export default crmPublicRouter;
export { crmPublicRouter };
