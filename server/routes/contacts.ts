import express from "express";

const router = express.Router();

/**
 * Health check route to verify the Contacts API is active
 */
router.get("/", (_req, res) => {
  res.json({
    message: "✅ Contacts API online",
    endpoints: ["/api/contacts/seed", "/api/contacts"],
  });
});

/**
 * @route GET /api/contacts/seed
 * @desc Seeds sample contacts (mock data for testing)
 */
router.get("/seed", async (_req, res) => {
  try {
    const contacts = [
      { id: "c-001", name: "Todd Werboweski", email: "todd@boreal.financial" },
      { id: "c-002", name: "Andrew Morgan", email: "andrew@boreal.financial" },
      { id: "c-003", name: "Lisa Morgan", email: "lisa@boreal.financial" },
    ];

    console.log("✅ [Contacts] Seed route executed successfully");
    res.json({
      message: "✅ Contacts seeded successfully",
      count: contacts.length,
      contacts,
    });
  } catch (err: any) {
    console.error("❌ [Contacts] Error seeding contacts:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
