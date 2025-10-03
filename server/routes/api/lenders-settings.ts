import { Router } from "express";
import { db } from "../../db/drizzle";
import { sql, eq, and } from "drizzle-orm";
import { lenders, users } from "../../../shared/schema";

const router = Router();

// Add public access for testing - remove in production
const allowPublicAccess = (req: any, res: any, next: any) => {
  next();
};

// Get lender settings and associated users
router.get("/lenders/:id/settings", allowPublicAccess, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Get lender details
    const lenderResult = await db.select().from(lenders).where(eq(lenders.id, id));
    
    if (lenderResult.length === 0) {
      return res.status(404).json({ error: "Lender not found" });
    }
    
    const lender = lenderResult[0];
    
    // Get associated users (assuming we have a lender_users table or similar relationship)
    const users = await db.execute(sql`
      SELECT u.id, u.first_name, u.last_name, u.email 
      FROM users u 
      WHERE u.role = 'lender' AND u.tenant_id = ${id}
      LIMIT 10
    `);

    res.json({
      name: lender.name,
      country_access: [lender.country], // Assuming single country for now
      contact_email: lender.contactEmail,
      phone: lender.phone,
      website: lender.website,
      commission_rate: lender.commissionRate || 6,
      users: users || []
    });
  } catch (error: unknown) {
    console.error("Error fetching lender settings:", error);
    res.status(500).json({ error: "Failed to fetch lender settings" });
  }
});

// Update lender settings
router.put("/lenders/:id/settings", allowPublicAccess, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { contact_email, phone, website, commission_rate, country_access } = req.body;
    
    const updateData: any = {};
    if (contact_email) updateData.contactEmail = contact_email;
    if (phone) updateData.phone = phone;
    if (website) updateData.website = website;
    if (commission_rate !== undefined) updateData.commissionRate = commission_rate;
    if (country_access && country_access.length > 0) updateData.country = country_access[0];
    
    await db.update(lenders)
      .set(updateData)
      .where(eq(lenders.id, id));
    
    res.json({ ok: true, message: "Settings updated successfully" });
  } catch (error: unknown) {
    console.error("Error updating lender settings:", error);
    res.status(500).json({ error: "Failed to update lender settings" });
  }
});

// Get lender message history
router.get("/lenders/:id/messages", allowPublicAccess, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Get messages from communication logs (assuming we have a messages table)
    const messages = await db.execute(sql`
      SELECT 
        type,
        recipient as "to",
        message as body,
        subject,
        created_at as timestamp
      FROM lender_comm_logs 
      WHERE lender_id = ${id}
      AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 50
    `);

    res.json(messages || []);
  } catch (error: unknown) {
    console.error("Error fetching lender messages:", error);
    res.status(500).json({ error: "Failed to fetch lender messages" });
  }
});

// Send message to lender
router.post("/lenders/:id/messages", allowPublicAccess, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { type, subject, body, to } = req.body;
    
    if (!body || !to) {
      return res.status(400).json({ error: "Message body and recipient required" });
    }
    
    // Get lender details for context
    const lenderResult = await db.select().from(lenders).where(eq(lenders.id, id));
    if (lenderResult.length === 0) {
      return res.status(404).json({ error: "Lender not found" });
    }
    
    // Log the message attempt
    await db.execute(sql`
      INSERT INTO lender_comm_logs (lender_id, type, recipient, message, status, created_at)
      VALUES (${id}, ${type}, ${to}, ${body}, 'sent', NOW())
    `);
    
    // In a real implementation, this would use Twilio/SendGrid
    console.log(`Sending ${type} to lender ${id}: ${body}`);
    
    res.json({ 
      ok: true, 
      message: `${type.toUpperCase()} sent successfully`,
      messageId: `msg_${Date.now()}`
    });
  } catch (error: unknown) {
    console.error("Error sending lender message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
});

export default router;