import { Router } from "express";
import { requireAnyRole } from "../security/rbac";
import { findContactAcrossTenants } from "../services/multiTenantComms";

const router = Router();

// Get unified communications across all tenants
router.get("/", requireAnyRole(["admin","manager","agent","marketing"]), async (req: any, res) => {
  const { tenant: filterTenant } = req.query;
  
  try {
    // Mock unified comms data - in real implementation this would query across tenant tables
    const unifiedComms = [
      {
        id: "comm-1",
        type: "call",
        direction: "inbound", 
        fromNumber: "+15551234567",
        toNumber: "+18254511768",
        contact: { name: "John Doe", company: "ABC Corp" },
        tenant: "bf",
        tenantName: "Boreal Financial",
        duration: 120,
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: "completed"
      },
      {
        id: "comm-2", 
        type: "sms",
        direction: "outbound",
        fromNumber: "+17753146801",
        toNumber: "+15551234567", 
        contact: { name: "Jane Smith", company: "XYZ Inc" },
        tenant: "slf",
        tenantName: "Site Level Financial",
        message: "Thank you for your application. We'll be in touch soon.",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        status: "delivered"
      }
    ];
    
    // Apply tenant filter if specified
    const filtered = filterTenant && filterTenant !== 'all' 
      ? unifiedComms.filter(comm => comm.tenant === filterTenant)
      : unifiedComms;
      
    res.json({ communications: filtered });
  } catch (error: unknown) {
    console.error("[UNIFIED-COMMS] Error:", error);
    res.status(500).json({ error: "fetch_failed" });
  }
});

// Search contacts across tenants
router.get("/contacts/search", requireAnyRole(["admin","manager","agent","marketing"]), async (req: any, res) => {
  const { phone, unified } = req.query;
  
  if (!phone) {
    return res.status(400).json({ error: "phone_required" });
  }
  
  try {
    const contacts = await findContactAcrossTenants(phone as string, req.app.locals.db);
    res.json({ contacts });
  } catch (error: unknown) {
    console.error("[CONTACT-SEARCH] Error:", error);
    res.status(500).json({ error: "search_failed" });
  }
});

export default router;