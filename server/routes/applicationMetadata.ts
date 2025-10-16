import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();

// Simple PostgreSQL connection for safe queries
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

console.log('🔧 [APP-METADATA] Application metadata router loaded');

// Simple test endpoint to verify this router works
router.get('/test', (req: any, res: any) => {
  console.log('✅ [APP-METADATA] Test endpoint hit');
  res.json({
    success: true,
    message: 'Application metadata router working',
    timestamp: new Date().toISOString()
  });
});

// GET /api/application-metadata/:id - Safe public access to application metadata for upload page
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    console.log(`🔍 [APP-METADATA] Request for application metadata: ${id}`);
    
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      console.log(`❌ [APP-METADATA] Invalid UUID format: ${id}`);
      return res.status(400).json({
        success: false,
        error: 'Invalid application ID format'
      });
    }

    // Force JSON content type to prevent HTML fallback
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    
    // Query database with safe approach
    const result = await pool.query(`
      SELECT 
        id,
        status,
        stage,
        product_category,
        loan_category,
        requested_amount,
        dba_name,
        business_name,
        created_at
      FROM applications 
      WHERE id = $1
      LIMIT 1
    `, [id]);

    if (result.rows.length === 0) {
      console.log(`❌ [APP-METADATA] Application not found: ${id}`);
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const application = result.rows[0];
    
    // Get document requirements based on category
    const documentRequirements: { [key: string]: string[] } = {
      'working_capital': ['Bank Statements', 'Financial Statements', 'Business License', 'Tax Returns'],
      'equipment_financing': ['Bank Statements', 'Equipment Quote', 'Financial Statements', 'Business License', 'Tax Returns'],
      'invoice_factoring': ['Bank Statements', 'A/R Aging Report', 'Financial Statements', 'Business License', 'Tax Returns', 'Sample Invoices'],
      'merchant_cash_advance': ['Bank Statements', 'Financial Statements', 'Business License', 'Tax Returns', 'Business Plan'],
      'term_loan': ['Bank Statements', 'Financial Statements', 'Business License', 'Tax Returns', 'Personal Guarantee'],
      'purchase_order_financing': ['Bank Statements', 'Purchase Orders', 'Business License', 'Tax Returns', 'Supplier Agreements']
    };

    const category = application.product_category || application.loan_category || 'working_capital';
    const businessName = application.dba_name || application.business_name || 'Business Name Not Set';
    const requiredDocuments = documentRequirements[category] || ['Bank Statements', 'Business License', 'Tax Returns'];

    const safeMetadata = {
      success: true,
      application: {
        id: application.id,
        status: application.status,
        stage: application.stage,
        businessName: businessName,
        productCategory: category,
        requestedAmount: application.requested_amount || 'Amount Not Set',
        createdAt: application.created_at,
        requiredDocuments: requiredDocuments
      }
    };

    console.log(`✅ [APP-METADATA] Returning safe metadata for application: ${id}`);
    res.json(safeMetadata);

  } catch (error: any) {
    console.error(`❌ [APP-METADATA] Error fetching application metadata:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch application metadata',
      message: error instanceof Error ? error.message : String(error)
    });
  }
});

console.log('✅ [APP-METADATA] Application metadata routes registered');

export default router;