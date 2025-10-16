/**
 * Document Workflow API Routes
 * Handles missing document tracking, bypass functionality, and document requirement rules
 */
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { applications } from "../../shared/schema";
import { bearerAuth } from "../middleware/bearerAuth";

const router = Router();

/**
 * POST /api/applications/:id/nudge-documents
 * Mark application as having missing documents
 */
router.post("/api/applications/:id/nudge-documents", bearerAuth, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Update application to mark missing documents
    await db
      .update(applications)
      .set({ 
        missingDocs: true,
        updatedAt: new Date()
      })
      .where(eq(applications.id, id));

    console.log(`📋 Application ${id} marked with missing documents`);

    res.json({ 
      success: true,
      message: "Application marked as having missing documents",
      applicationId: id
    });

  } catch (error: unknown) {
    console.error('❌ Error marking missing documents:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark missing documents',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * GET /api/public/applications/:id/required-docs
 * Public endpoint to retrieve required document rules for an application
 */
router.get("/api/public/applications/:id/required-docs", async (req: any, res: any) => {
  try {
    const { id } = req.params;
    
    // Get application details
    const application = await db
      .select({
        id: applications.id,
        productCategory: applications.productCategory,
        requestedAmount: applications.requestedAmount,
        formData: applications.formData
      })
      .from(applications)
      .where(eq(applications.id, id))
      .limit(1);

    if (application.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Application not found'
      });
    }

    const app = application[0];
    
    // Compute required documents based on application details
    const rules = await computeRequiredDocs(app);
    
    console.log(`📄 Retrieved document requirements for application ${id}`);

    res.json({ 
      success: true,
      rules,
      applicationId: id,
      category: app.productCategory,
      amount: app.requestedAmount
    });

  } catch (error: unknown) {
    console.error('❌ Error retrieving document requirements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve document requirements',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * Compute required documents based on application details
 */
async function computeRequiredDocs(application: any) {
  const { productCategory, requestedAmount, formData } = application;
  
  // Base required documents for all applications
  const baseDocuments = [
    {
      id: 'bank_statements_6m',
      category: 'bank_statements',
      displayName: '6-Month Bank Statements',
      description: 'Recent 6 months of business bank statements',
      required: true
    },
    {
      id: 'tax_returns_2y',
      category: 'tax_returns', 
      displayName: '2-Year Tax Returns',
      description: 'Business tax returns for the last 2 years',
      required: true
    },
    {
      id: 'financial_statements',
      category: 'financial_statements',
      displayName: 'Financial Statements',
      description: 'Profit & Loss, Balance Sheet statements',
      required: true
    },
    {
      id: 'business_license',
      category: 'business_license',
      displayName: 'Business License',
      description: 'Current business license or registration',
      required: true
    }
  ];

  // Category-specific requirements
  const categoryRequirements: Record<string, any[]> = {
    'invoice_factoring': [
      {
        id: 'accounts_receivable_aging',
        category: 'accounts_receivable_aging',
        displayName: 'Accounts Receivable Aging',
        description: 'Report showing outstanding customer payments',
        required: true
      },
      {
        id: 'sample_invoices',
        category: 'invoice_samples',
        displayName: 'Sample Invoices',
        description: 'Sample invoices showing business revenue',
        required: true
      }
    ],
    'equipment_financing': [
      {
        id: 'equipment_quote',
        category: 'equipment_quote',
        displayName: 'Equipment Quote',
        description: 'Quote or invoice for equipment being financed',
        required: true
      }
    ],
    'purchase_order_financing': [
      {
        id: 'purchase_order',
        category: 'purchase_order',
        displayName: 'Purchase Order',
        description: 'Purchase order requiring financing',
        required: true
      },
      {
        id: 'supplier_agreement',
        category: 'supplier_agreement',
        displayName: 'Supplier Agreement',
        description: 'Agreement with supplier',
        required: true
      }
    ]
  };

  // Amount-based requirements
  const amountBasedDocs = [];
  if (requestedAmount && parseFloat(requestedAmount.toString()) > 500000) {
    amountBasedDocs.push({
      id: 'audited_financials',
      category: 'audited_financials',
      displayName: 'Audited Financials',
      description: 'Audited financial statements for large loans',
      required: true
    });
    amountBasedDocs.push({
      id: 'personal_guarantee',
      category: 'personal_guarantee', 
      displayName: 'Personal Guarantee',
      description: 'Personal guarantee from business owner',
      required: true
    });
  }

  // Combine all requirements
  const allDocuments = [
    ...baseDocuments,
    ...(categoryRequirements[productCategory] || []),
    ...amountBasedDocs
  ];

  return {
    required: allDocuments.filter(doc => doc.required),
    optional: allDocuments.filter(doc => !doc.required),
    totalCount: allDocuments.length,
    requiredCount: allDocuments.filter(doc => doc.required).length,
    category: productCategory,
    amount: requestedAmount
  };
}

export default router;