import { Router } from "express";
import { db } from "../db";
import { contacts, contactLogs } from "../../shared/schema";
import { eq, ilike, or, desc, sql } from "drizzle-orm";
import { z } from "zod";

const router = Router();

// Contact status validation schema
const ContactStatus = z.enum([
  "lead",
  "active", 
  "customer",
  "inactive",
  "lender",
  "referrer",
  "staff",
  "non_marketing",
]);

const createContactSchema = z.object({
  name: z.string().min(1).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  status: ContactStatus.default("lead"),
  notes: z.string().optional().nullable(),
});

// GET /api/contacts - List contacts from real database
router.get("/", async (req: any, res: any) => {
  try {
    const rows = await db.execute(sql`
      SELECT
        id,
        COALESCE(first_name, form_data->>'firstName', '') AS first_name,
        COALESCE(last_name, form_data->>'lastName', '') AS last_name,
        COALESCE(email, form_data->>'email', '') AS email,
        COALESCE(phone, form_data->>'phone', '') AS phone,
        COALESCE(status, 'Active') AS status
      FROM contacts
      ORDER BY updatedAt DESC
      LIMIT 500
    `);

    // ✅ UI expects array; avoid objects/undefined that cause j.map error
    res.json({ contacts: Array.isArray(rows.rows) ? rows.rows : [] });
  } catch (error: unknown) {
    console.error("Error fetching contacts:", error);
    res.json({ contacts: [] });
  }
});

// GET /api/contacts/:id - Get single contact
router.get("/:id", async (req: any, res: any) => {
  try {
    const result = await db.select().from(contacts).where(eq(contacts.id, req.params.id)).limit(1);
    
    if (!result.length) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    const c = result[0];
    const mapped = {
      id: c.id,
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email,
      phone: c.phone,
      company: c.companyName || c.businessName,
      title: c.jobTitle,
      status: c.status || "active",
      owner: "admin",
      createdAt: c.createdAt?.toISOString(),
      updatedAt: c.updatedAt?.toISOString()
    };
    
    res.json(mapped);
  } catch (error: unknown) {
    console.error("Error fetching contact:", error);
    res.status(500).json({ error: "Failed to fetch contact" });
  }
});

// POST /api/contacts - Create contact
router.post("/", async (req: any, res: any) => {
  try {
    // Validate the request body
    const validatedData = createContactSchema.parse(req.body);
    
    // Handle different name formats
    let firstName = validatedData.firstName;
    let lastName = validatedData.lastName;
    
    if (validatedData.name && !firstName && !lastName) {
      const nameParts = validatedData.name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    const result = await db.insert(contacts).values({
      firstName,
      lastName, 
      email: validatedData.email,
      phone: validatedData.phone,
      companyName: validatedData.company,
      jobTitle: validatedData.title,
      status: validatedData.status
    }).returning();
    
    const c = result[0];
    const mapped = {
      id: c.id,
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email,
      phone: c.phone,
      company: c.companyName,
      title: c.jobTitle,
      status: c.status || "active",
      owner: "admin",
      createdAt: c.createdAt?.toISOString(),
      updatedAt: c.updatedAt?.toISOString()
    };
    
    res.status(201).json(mapped);
  } catch (error: unknown) {
    console.error("Error creating contact:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to create contact" });
  }
});

// PUT /api/contacts/:id - Update contact
router.put("/:id", async (req: any, res: any) => {
  try {
    // Validate the request body (same schema, but for updates)
    const validatedData = createContactSchema.partial().parse(req.body);
    
    // Handle different name formats
    let firstName = validatedData.firstName;
    let lastName = validatedData.lastName;
    
    if (validatedData.name && !firstName && !lastName) {
      const nameParts = validatedData.name.split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }
    
    const result = await db.update(contacts)
      .set({
        firstName,
        lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        companyName: validatedData.company,
        jobTitle: validatedData.title,
        status: validatedData.status,
        updatedAt: new Date()
      })
      .where(eq(contacts.id, req.params.id))
      .returning();
    
    if (!result.length) {
      return res.status(404).json({ error: "Contact not found" });
    }
    
    const c = result[0];
    const mapped = {
      id: c.id,
      firstName: c.firstName || "",
      lastName: c.lastName || "",
      email: c.email,
      phone: c.phone,
      company: c.companyName,
      title: c.jobTitle,
      status: c.status || "active",
      owner: "admin",
      createdAt: c.createdAt?.toISOString(),
      updatedAt: c.updatedAt?.toISOString()
    };
    
    res.json(mapped);
  } catch (error: unknown) {
    console.error("Error updating contact:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation failed", details: error.errors });
    }
    res.status(500).json({ error: "Failed to update contact" });
  }
});

// GET /api/contacts/:id/activities - Get contact activities from logs
router.get("/:id/activities", async (req: any, res: any) => {
  try {
    const activities = await db.select()
      .from(contactLogs)
      .where(eq(contactLogs.contactId, req.params.id))
      .orderBy(desc(contactLogs.createdAt))
      .limit(50);
    
    const mapped = activities.map((a: any) => ({
      id: a.id,
      type: a.type || "note",
      at: a.createdAt?.toISOString() || new Date().toISOString(),
      author: "system",
      direction: a.direction || "out",
      subject: "",
      body: a.content || "",
      meta: a.metadata
    }));
    
    res.json(mapped);
  } catch (error: unknown) {
    console.error("Error fetching activities:", error);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

// POST /api/contacts/:id/activities - Log contact activity
router.post("/:id/activities", async (req: any, res: any) => {
  try {
    const { type, subject, body, direction } = req.body;
    
    await db.insert(contactLogs).values({
      contactId: req.params.id,
      type: type,
      content: body,
      direction: direction || null,
      metadata: { subject },
      createdAt: new Date()
    });
    
    res.json({ success: true });
  } catch (error: unknown) {
    console.error("Error logging activity:", error);
    res.status(500).json({ error: "Failed to log activity" });
  }
});

export default router;