import { Router } from 'express';
import { z } from 'zod';
import { staffOnly, authenticatedRoute } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

const createContactSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  position: z.string().optional(),
  source: z.string().optional(),
  notes: z.string().optional()
});

// GET /contacts - List contacts with tenant isolation
router.get('/', staffOnly, asyncHandler(async (req, res) => {
  // TODO: Query database with tenant isolation
  // WHERE tenant_id = req.tenantId
  
  res.json([]);
}));

// POST /contacts - Create new contact
router.post('/', staffOnly, asyncHandler(async (req, res) => {
  const contactData = createContactSchema.parse(req.body);
  
  // TODO: Insert into database with tenant isolation
  const contact = {
    id: Math.random().toString(36).substr(2, 9),
    tenantId: req.tenantId,
    ...contactData,
    createdAt: new Date()
  };

  res.status(201).json(contact);
}));

// GET /contacts/:id - Get specific contact
router.get('/:id', staffOnly, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // TODO: Query database with tenant isolation
  // WHERE id = :id AND tenant_id = req.tenantId
  
  res.json({ 
    id,
    tenantId: req.tenantId,
    message: 'Contact details'
  });
}));

export { router as contactRoutes };