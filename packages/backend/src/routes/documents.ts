import { Router } from "express";
import multer from "multer";
import { isAuthenticated } from "../middleware/auth.js";
import { storage } from "../storage.js";
import { insertDocumentSchema } from "@shared/schema";

const router = Router();

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow only certain file types
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF and image files are allowed.'));
    }
  },
});

// Get documents for an application
router.get('/application/:applicationId', isAuthenticated, async (req, res) => {
  try {
    const { applicationId } = req.params;
    const tenantId = req.currentUser!.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant associated with user" });
    }

    // Verify application exists and user has access
    const application = await storage.getApplication(applicationId, tenantId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (req.currentUser!.role === 'client' && application.userId !== req.currentUser!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const documents = await storage.getDocumentsByApplication(applicationId);
    res.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).json({ message: "Failed to fetch documents" });
  }
});

// Upload document
router.post('/upload', isAuthenticated, upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { applicationId, documentType } = req.body;
    const userId = req.currentUser!.id;
    const tenantId = req.currentUser!.tenantId;
    
    if (!tenantId) {
      return res.status(400).json({ message: "No tenant associated with user" });
    }

    // Verify application exists and user has access
    const application = await storage.getApplication(applicationId, tenantId);
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (req.currentUser!.role === 'client' && application.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const documentData = insertDocumentSchema.parse({
      applicationId,
      userId,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      documentType,
      uploadPath: req.file.path,
    });

    const document = await storage.createDocument(documentData);
    res.status(201).json(document);
  } catch (error) {
    console.error("Error uploading document:", error);
    res.status(500).json({ message: "Failed to upload document" });
  }
});

export default router;
