// Simple test router to bypass all authentication
import { Router } from 'express';
import crypto from 'crypto';
const router = Router();

router.get('/test-bypass', (req: any, res: any) => {
  res.json({ 
    status: 'success', 
    message: 'Authentication bypass working!',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Application creation endpoint (public)
router.post('/public-applications', async (req: any, res: any) => {
  try {
    console.log('📝 [PUBLIC-APP] Creating application without auth required');
    
    const {
      business_name = 'Test Company',
      contact_email = 'test@example.com',
      contact_phone = '555-0123',
      business_type = 'llc',
      requested_amount = 25000,
      loan_purpose = 'equipment'
    } = req.body;

    // Create a test application entry
    const applicationData = {
      id: crypto.randomUUID(),
      business_name,
      contact_email,
      contact_phone,
      business_type,
      requested_amount,
      loan_purpose,
      status: 'new',
      created_at: new Date().toISOString()
    };

    console.log('✅ [PUBLIC-APP] Application created:', applicationData.id);
    
    res.json({
      success: true,
      application: applicationData,
      message: 'Application created successfully without authentication'
    });
    
  } catch (error: any) {
    console.error('❌ [PUBLIC-APP] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create application',
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;
