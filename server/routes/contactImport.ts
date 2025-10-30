import { Router } from "express";
import { requireAnyRole } from "../security/rbac";
import { audit } from "../services/audit";

const router = Router();

// Clone contact from one tenant to another
router.post("/clone", requireAnyRole(["admin","manager"]), async (req: any, res) => {
  try {
    const { contactId, sourceTenant, targetTenant } = req.body;
    
    if (!contactId || !sourceTenant || !targetTenant) {
      return res.status(400).json({ error: "missing_required_fields" });
    }
    
    if (!['bf', 'slf'].includes(sourceTenant) || !['bf', 'slf'].includes(targetTenant)) {
      return res.status(400).json({ error: "invalid_tenant" });
    }
    
    if (sourceTenant === targetTenant) {
      return res.status(400).json({ error: "same_tenant" });
    }
    
    // Mock source contact fetch
    const sourceContact = {
      id: contactId,
      tenant_id: sourceTenant,
      first_name: "John",
      last_name: "Doe",
      email: "john.doe@example.com",
      phone: "+15551234567",
      company: "Example Corp",
      lifecycle_stage: "Lead",
      owner_user_id: req.user?.id,
      tags: ["qualified", "hot-lead"],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Create new contact in target tenant
    const clonedContact = {
      ...sourceContact,
      id: `cloned-${Date.now()}`,
      tenant_id: targetTenant,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Audit logging
    audit.log({ 
      actor: req.user?.email, 
      action: "contact:cloned", 
      details: { 
        sourceContactId: contactId, 
        clonedContactId: clonedContact.id,
        sourceTenant, 
        targetTenant 
      } 
    });
    
    res.json({ 
      success: true, 
      clonedContact,
      message: `Contact cloned from ${sourceTenant.toUpperCase()} to ${targetTenant.toUpperCase()}`
    });
  } catch (error: unknown) {
    console.error("[CONTACT-IMPORT] Clone error:", error);
    res.status(500).json({ error: "clone_failed" });
  }
});

// Bulk import contacts to target tenant
router.post("/bulk-import", requireAnyRole(["admin","manager"]), async (req: any, res) => {
  try {
    const { contacts, targetTenant } = req.body;
    
    if (!Array.isArray(contacts) || !targetTenant) {
      return res.status(400).json({ error: "invalid_request" });
    }
    
    if (!['bf', 'slf'].includes(targetTenant)) {
      return res.status(400).json({ error: "invalid_tenant" });
    }
    
    const importedContacts = contacts.map((contact, index) => ({
      ...contact,
      id: `imported-${Date.now()}-${index}`,
      tenant_id: targetTenant,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    // Audit logging
    audit.log({ 
      actor: req.user?.email, 
      action: "contact:bulk_imported", 
      details: { 
        targetTenant, 
        count: importedContacts.length 
      } 
    });
    
    res.json({ 
      success: true, 
      importedContacts,
      count: importedContacts.length,
      message: `${importedContacts.length} contacts imported to ${targetTenant.toUpperCase()}`
    });
  } catch (error: unknown) {
    console.error("[CONTACT-IMPORT] Bulk import error:", error);
    res.status(500).json({ error: "import_failed" });
  }
});

// Get import preview (validate contacts before import)
router.post("/preview", requireAnyRole(["admin","manager"]), async (req: any, res) => {
  try {
    const { contacts, targetTenant } = req.body;
    
    if (!Array.isArray(contacts) || !targetTenant) {
      return res.status(400).json({ error: "invalid_request" });
    }
    
    const validContacts = [];
    const invalidContacts = [];
    
    contacts.forEach((contact, index) => {
      const errors = [];
      
      if (!contact.first_name?.trim()) errors.push("Missing first name");
      if (!contact.last_name?.trim()) errors.push("Missing last name");
      if (!contact.email?.trim() && !contact.phone?.trim()) errors.push("Missing email or phone");
      
      if (errors.length === 0) {
        validContacts.push({ ...contact, index });
      } else {
        invalidContacts.push({ ...contact, index, errors });
      }
    });
    
    res.json({
      preview: {
        totalContacts: contacts.length,
        validContacts: validContacts.length,
        invalidContacts: invalidContacts.length,
        targetTenant
      },
      validContacts: validContacts.slice(0, 5), // Preview first 5
      invalidContacts: invalidContacts.slice(0, 5) // Preview first 5 errors
    });
  } catch (error: unknown) {
    console.error("[CONTACT-IMPORT] Preview error:", error);
    res.status(500).json({ error: "preview_failed" });
  }
});

export default router;