import { Router } from 'express';
import { z } from 'zod';
import { staffOnly, authenticatedRoute } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /applications - List applications with tenant isolation
router.get('/', authenticatedRoute, asyncHandler(async (req, res) => {
  // TODO: Implement database query with tenant filtering
  // WHERE tenant_id = req.tenantId
  
  const mockApplications = [
    {
      id: '24923b63-0d9e-4339-a326-601721e8afa5',
      tenantId: req.tenantId,
      userId: 'test-user-123',
      status: 'submitted',
      requestedAmount: 75000,
      businessName: 'Acme Corp',
      createdAt: new Date()
    }
  ];

  res.json(mockApplications);
}));

// POST /applications - Create new application
router.post('/', authenticatedRoute, asyncHandler(async (req, res) => {
  // TODO: Validate input with Zod schema
  // TODO: Insert into database with tenant_id
  
  const newApplication = {
    id: Math.random().toString(36).substr(2, 9),
    tenantId: req.tenantId,
    userId: req.user?.id,
    status: 'draft',
    createdAt: new Date(),
    ...req.body
  };

  res.status(201).json(newApplication);
}));

// GET /applications/:id - Get specific application
router.get('/:id', authenticatedRoute, asyncHandler(async (req, res) => {
  const { id } = req.params;
  
  // TODO: Query database with tenant isolation
  // WHERE id = :id AND tenant_id = req.tenantId
  
  res.json({ 
    id,
    tenantId: req.tenantId,
    message: 'Application details'
  });
}));

export { router as applicationRoutes };