import { Router } from "express";
import { z } from "zod";
import { isAuthenticated, requireRole } from "../middleware/auth.js";
import { storage } from "../storage.js";
import { insertApplicationSchema } from "@shared/schema";

const router = Router();

// Get all applications (staff/admin only)
router.get('/', isAuthenticated, requireRole(['staff', 'admin']), async (req, res) => {
  try {
    const tenantId = req.currentUser!.tenantId;
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant associated with user" });
    }

    const applications = await storage.getApplicationsByTenant(tenantId);
    res.json(applications);
  } catch (error) {
    console.error("Error fetching applications:", error);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
});

// Get user's applications (client only)
router.get('/my', isAuthenticated, requireRole(['client']), async (req, res) => {
  try {
    const userId = req.currentUser!.id;
    const tenantId = req.currentUser!.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant associated with user" });
    }

    const applications = await storage.getApplicationsByUser(userId, tenantId);
    res.json(applications);
  } catch (error) {
    console.error("Error fetching user applications:", error);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
});

// Get single application
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.currentUser!.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant associated with user" });
    }

    const application = await storage.getApplication(id, tenantId);
    
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Check permissions
    if (req.currentUser!.role === 'client' && application.userId !== req.currentUser!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    res.json(application);
  } catch (error) {
    console.error("Error fetching application:", error);
    res.status(500).json({ message: "Failed to fetch application" });
  }
});

// Create application
router.post('/', isAuthenticated, requireRole(['client']), async (req, res) => {
  try {
    const userId = req.currentUser!.id;
    const tenantId = req.currentUser!.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant associated with user" });
    }

    // Get or create business for this user
    let business = await storage.getBusinessByUserId(userId, tenantId);
    if (!business) {
      business = await storage.createBusiness({
        userId,
        tenantId,
        businessName: req.body.businessName || "Untitled Business",
      });
    }

    const applicationData = insertApplicationSchema.parse({
      ...req.body,
      userId,
      businessId: business.id,
      tenantId,
    });

    const application = await storage.createApplication(applicationData);
    res.status(201).json(application);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error creating application:", error);
    res.status(500).json({ message: "Failed to create application" });
  }
});

// Update application
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = req.currentUser!.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant associated with user" });
    }

    const existingApplication = await storage.getApplication(id, tenantId);
    
    if (!existingApplication) {
      return res.status(404).json({ message: "Application not found" });
    }

    // Check permissions
    if (req.currentUser!.role === 'client' && existingApplication.userId !== req.currentUser!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const application = await storage.updateApplication(id, req.body);
    res.json(application);
  } catch (error) {
    console.error("Error updating application:", error);
    res.status(500).json({ message: "Failed to update application" });
  }
});

export default router;
