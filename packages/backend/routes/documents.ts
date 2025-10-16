import { Router } from 'express';
import multer from 'multer';
import { staffOnly, authenticatedRoute } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// GET /documents - List documents with tenant isolation
router.get('/', authenticatedRoute, asyncHandler(async (req, res) => {
  const { application_id } = req.query;
  
  // TODO: Query database with tenant isolation
  // WHERE tenant_id = req.tenantId AND (application_id = ? OR ? IS NULL)
  
  res.json([]);
}));

// POST /documents/upload - Upload document with tenant isolation
router.post('/upload', authenticatedRoute, upload.single('document'), asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const { applicationId, documentType } = req.body;

  // TODO: Store file with tenant isolation
  // INSERT INTO documents (tenant_id, application_id, uploaded_by, ...)
  // VALUES (req.tenantId, applicationId, req.user.id, ...)

  const document = {
    id: Math.random().toString(36).substr(2, 9),
    tenantId: req.tenantId,
    applicationId,
    uploadedBy: req.user?.id,
    fileName: req.file.filename,
    originalName: req.file.originalname,
    fileType: req.file.mimetype,
    fileSize: req.file.size,
    documentType,
    createdAt: new Date()
  };

  res.status(201).json(document);
}));

export { router as documentRoutes };