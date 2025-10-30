import { Router } from 'express';
import express from 'express';

// Import all application route handlers
import applicationsCreateRouter from './applications/create';
import applicationsSubmitRouter from './applications/submit';
import applicationsUploadRouter from './applications/upload';
import applicationsCompleteRouter from './applications/complete';

const router = Router();

// Enhanced debug logging to identify routing issues
router.use('*', async (req: any, res: any, next: any) => {
  console.log(`🔍 PUBLIC APPLICATIONS ROUTER: ${req.method} ${req.originalUrl} - Base: ${req.baseUrl}, Path: ${req.path}`);
  // Only log actual errors, suppress debug info that confuses clients
  if (req.headers.origin === 'https://client.boreal.financial') {
    console.log(`🔥 CLIENT PORTAL: ${req.method} ${req.originalUrl}`);
  }
  next();
});

// Ensure JSON parsing middleware is applied to all routes in this router
router.use(express.json({ limit: '50mb' }));
router.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Mount create application route (handles POST /) with enhanced debugging
console.log('🚀 Mounting applications create router...');
router.use('/', applicationsCreateRouter);
router.use('/test', applicationsCreateRouter);
console.log('✅ Applications create router mounted successfully');

// Mount submit application route
router.use('/', applicationsSubmitRouter);

// Mount upload route (note: this goes to /upload path, not /applications)
router.use('/upload', applicationsUploadRouter);


// Mount complete application route
router.use('/', applicationsCompleteRouter);

// Mount finalize application route (for lender matching transition)
import applicationsFinalizeRouter from './applications/finalize';
router.use('/', applicationsFinalizeRouter);



// Debug endpoint for verification testing
router.get('/debug/applications/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: 'Invalid UUID format' });
    }

    const { db } = await import('../db');
    const { applications } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);
      
    if (!app) {
      return res.status(404).json({ error: 'Application not found' });
    }
    
    res.json({ 
      success: true,
      applicationId: app.id,
      status: app.status,
      createdAt: app.createdAt
    });
  } catch (error: unknown) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add missing GET /:id endpoint for application retrieval
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid application ID format'
      });
    }

    // Fetch application from database
    const { db } = await import('../db');
    const { applications, businesses } = await import('../../shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);

    if (!application) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    // Optionally fetch business details
    let business = null;
    if (application.businessId) {
      const [businessRecord] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.id, application.businessId))
        .limit(1);
      business = businessRecord;
    }

    // Enhanced response for client polling and status detection
    const response = {
      success: true,
      data: {
        id: application.id,
        status: application.status,
        contactEmail: application.contactEmail,
        requestedAmount: application.requestedAmount,
        loanPurpose: application.loanPurpose,
        business: business ? {
          businessName: business.businessName,
          contactFirstName: business.contactFirstName,
          contactLastName: business.contactLastName,
          contactEmail: business.contactEmail,
          contactPhone: business.contactPhone
        } : null,
        createdAt: application.createdAt,
        updatedAt: application.updatedAt
      }
    };

    // Add CORS headers for client portal polling (no-cache for real-time status)
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    
    return res.json(response);

  } catch (error: unknown) {
    console.error('Error fetching public application:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Signing status endpoint removed - document signing no longer required


export default router;