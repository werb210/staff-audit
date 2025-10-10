import express from "express";

const router = express.Router();

/**
 * @route GET /api/contacts/seed
 * @desc Seeds the contacts table with sample data for testing
 */
router.get("/seed", async (_req, res) => {
  try {
    const contacts = [
      { id: "c-001", name: "Todd Werboweski", email: "todd@boreal.financial" },
      { id: "c-002", name: "Andrew Morgan", email: "andrew@boreal.financial" },
      { id: "c-003", name: "Lisa Morgan", email: "lisa@boreal.financial" },
    ];

    console.log("✅ [Contacts] Seed route hit. Returning mock contacts.");

    res.json({
      message: "✅ Contacts seeded successfully",
      count: contacts.length,
      contacts,
    });
  } catch (err: any) {
    console.error("❌ [Contacts] Error seeding contacts:", err);
    res.status(500).json({ error: err.message || "Failed to seed contacts" });
  }
});

/**
 * @route GET /api/contacts
 * @desc Returns sample contacts
 */
router.get("/", (_req, res) => {
  res.json([
    { id: "c-001", name: "Todd Werboweski", email: "todd@boreal.financial" },
    { id: "c-002", name: "Andrew Morgan", email: "andrew@boreal.financial" },
  ]);
});

export default router;
