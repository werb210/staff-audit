import { Router } from 'express';
import { pool } from '../db';
import { requireAuth } from '../middleware/rbacAuth';
import { RBACRequest } from '../types/rbac';

const router = Router();

interface MatchingProduct {
  id: string;
  lenderName: string;
  productName: string;
  productType: string;
  minAmount: number;
  maxAmount: number;
  interestRateMin: number;
  interestRateMax: number;
  termMin: number;
  termMax: number;
  geography: string[];
  industries: string[];
  approvalTime: string;
  requirements: string[];
  matchScore: number;
  eligibilityReason: string;
}

/**
 * GET /api/matching/:applicationId
 * Get matching lender products for an application
 * STEP 5: Core matching engine with comprehensive scoring
 */
router.get('/:applicationId', async (req: any, res: any) => {
  try {
    const { applicationId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    console.log(`🎯 [STEP 5 MATCHING] Starting matching engine for application ${applicationId}`);

    // 1. Verify all required documents are accepted
    const documentsQuery = `
      SELECT 
        COUNT(*) as total_docs,
        COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_docs,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected_docs,
        COUNT(CASE WHEN status = 'pending' OR status IS NULL THEN 1 END) as pending_docs
      FROM documents 
      WHERE application_id = $1`;
    
    const docsResult = await pool.query(documentsQuery, [applicationId]);
    const { total_docs, accepted_docs, rejected_docs, pending_docs } = docsResult.rows[0];

    console.log(`📋 [STEP 5 MATCHING] Document status: ${accepted_docs}/${total_docs} accepted, ${pending_docs} pending, ${rejected_docs} rejected`);

    // 2. Get application data with business info
    const appQuery = `
      SELECT 
        a.*,
        b.industry,
        b.business_type,
        b.years_in_business
      FROM applications a
      LEFT JOIN businesses b ON a.business_id = b.id
      WHERE a.id = $1`;
    
    const appResult = await pool.query(appQuery, [applicationId]);
    
    if (appResult.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const application = appResult.rows[0];
    
    // 3. Get all available lender products
    const lendersQuery = `
      SELECT 
        lp.*,
        l.company_name as lender_name,
        l.description as lender_description
      FROM lender_products lp
      JOIN lenders l ON lp.lender_id = l.id
      WHERE lp.is_active = true
      ORDER BY lp.created_at DESC`;
    
    const lendersResult = await pool.query(lendersQuery);
    
    // 4. Run matching algorithm
    const matchedProducts: MatchingProduct[] = [];
    
    for (const product of lendersResult.rows) {
      const matchResult = calculateMatchScore(application, product, {
        totalDocs: parseInt(total_docs),
        acceptedDocs: parseInt(accepted_docs),
        pendingDocs: parseInt(pending_docs),
        rejectedDocs: parseInt(rejected_docs)
      });
      
      if (matchResult.score > 0) {
        matchedProducts.push({
          id: product.id,
          lenderName: product.lender_name,
          productName: product.product_name,
          productType: product.product_type,
          minAmount: product.min_amount,
          maxAmount: product.max_amount,
          interestRateMin: product.interest_rate_min,
          interestRateMax: product.interest_rate_max,
          termMin: product.term_min,
          termMax: product.term_max,
          geography: product.geography || [],
          industries: product.industries || [],
          approvalTime: product.approval_time || 'N/A',
          requirements: product.requirements || [],
          matchScore: matchResult.score,
          eligibilityReason: matchResult.reason
        });
      }
    }

    // 5. Sort by match score and limit results
    matchedProducts.sort((a, b) => b.matchScore - a.matchScore);
    const topMatches = matchedProducts.slice(0, limit);

    console.log(`✅ [STEP 5 MATCHING] Found ${topMatches.length} matches, top score: ${topMatches[0]?.matchScore || 0}`);

    res.json({
      success: true,
      applicationId,
      documentsStatus: {
        total: parseInt(total_docs),
        accepted: parseInt(accepted_docs),
        pending: parseInt(pending_docs),
        rejected: parseInt(rejected_docs),
        allAccepted: parseInt(pending_docs) === 0 && parseInt(total_docs) > 0
      },
      matches: topMatches,
      totalMatches: matchedProducts.length,
      canSendToLenders: parseInt(pending_docs) === 0 && parseInt(total_docs) > 0,
      timestamp: new Date().toISOString()
    });

  } catch (error: unknown) {
    console.error('❌ [STEP 5 MATCHING] Matching engine error:', error);
    res.status(500).json({ 
      error: 'Failed to run matching engine',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

/**
 * STEP 5: Comprehensive matching algorithm
 * Scores lender products based on multiple criteria
 */
function calculateMatchScore(application: any, product: any, docStatus: any): { score: number, reason: string } {
  let score = 0;
  const reasons = [];

  // 1. Document verification requirement (40% weight)
  if (docStatus.totalDocs === 0) {
    return { score: 0, reason: 'No documents uploaded' };
  }
  
  if (docStatus.pendingDocs > 0) {
    return { score: 0, reason: `${docStatus.pendingDocs} documents pending verification` };
  }
  
  if (docStatus.acceptedDocs === docStatus.totalDocs) {
    score += 40;
    reasons.push('All documents verified');
  }

  // 2. Loan amount fit (25% weight)
  const requestedAmount = application.requestedamount || application.fundingAmount || 0;
  if (requestedAmount >= product.min_amount && requestedAmount <= product.max_amount) {
    score += 25;
    reasons.push('Amount within range');
  } else if (requestedAmount < product.min_amount) {
    const proximityScore = Math.max(0, 15 - ((product.min_amount - requestedAmount) / product.min_amount) * 15);
    score += proximityScore;
    reasons.push(`Amount below minimum by ${Math.round(((product.min_amount - requestedAmount) / product.min_amount) * 100)}%`);
  } else {
    reasons.push('Amount exceeds maximum');
  }

  // 3. Industry match (15% weight)
  const appIndustry = application.industry?.toLowerCase() || '';
  const productIndustries = (product.industries || []).map((i: string) => i.toLowerCase());
  
  if (productIndustries.length === 0 || productIndustries.includes('all') || productIndustries.includes(appIndustry)) {
    score += 15;
    reasons.push('Industry match');
  } else {
    // Partial match for related industries
    const industryKeywords = appIndustry.split(' ');
    const hasPartialMatch = productIndustries.some(pi => 
      industryKeywords.some(keyword => pi.includes(keyword) || keyword.includes(pi))
    );
    if (hasPartialMatch) {
      score += 8;
      reasons.push('Partial industry match');
    }
  }

  // 4. Geography match (10% weight)
  const appState = application.state?.toUpperCase() || 'US';
  const productGeography = (product.geography || ['US']).map((g: string) => g.toUpperCase());
  
  if (productGeography.includes('ALL') || productGeography.includes('US') || productGeography.includes(appState)) {
    score += 10;
    reasons.push('Geographic eligibility');
  }

  // 5. Revenue requirements (10% weight) 
  const annualRevenue = application.annual_revenue || 0;
  if (product.min_revenue && annualRevenue >= product.min_revenue) {
    score += 10;
    reasons.push('Revenue requirement met');
  } else if (!product.min_revenue) {
    score += 5; // No revenue requirement
    reasons.push('No specific revenue requirement');
  }

  return {
    score: Math.round(score),
    reason: reasons.join(', ')
  };
}

/**
 * POST /api/transmit/:applicationId/:productId
 * Send application to specific lender
 * STEP 5: Transmit application data to lender
 */
router.post('/transmit/:applicationId/:productId', async (req: any, res: any) => {
  try {
    const { applicationId, productId } = req.params;
    const userId = req.user?.id;

    console.log(`📤 [STEP 5 TRANSMIT] Sending application ${applicationId} to lender product ${productId}`);

    // 1. Verify all documents are accepted
    const documentsQuery = `
      SELECT COUNT(*) as total_docs,
             COUNT(CASE WHEN status = 'accepted' THEN 1 END) as accepted_docs
      FROM documents 
      WHERE application_id = $1`;
    
    const docsResult = await pool.query(documentsQuery, [applicationId]);
    const { total_docs, accepted_docs } = docsResult.rows[0];

    if (parseInt(total_docs) === 0 || parseInt(accepted_docs) !== parseInt(total_docs)) {
      return res.status(400).json({ 
        error: 'Cannot transmit - not all documents verified',
        documentsStatus: { total: total_docs, accepted: accepted_docs }
      });
    }

    // 2. Get complete application data
    const appDataQuery = `
      SELECT 
        a.*,
        b.*,
        array_agg(
          json_build_object(
            'id', d.id,
            'documentType', d.document_type,
            'fileName', d.file_name,
            'filePath', d.file_path,
            'status', d.status,
            'verifiedAt', d.verified_at
          )
        ) as documents
      FROM applications a
      LEFT JOIN businesses b ON a.business_id = b.id
      LEFT JOIN documents d ON a.id = d.application_id AND d.status = 'accepted'
      WHERE a.id = $1
      GROUP BY a.id, b.id`;
    
    const appData = await pool.query(appDataQuery, [applicationId]);
    
    if (appData.rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // 3. Get lender product info
    const productQuery = `
      SELECT lp.*, l.name as lender_name, l.contact_email
      FROM lender_products lp
      JOIN lenders l ON lp.lender_id = l.id
      WHERE lp.id = $1`;
    
    const productData = await pool.query(productQuery, [productId]);
    
    if (productData.rows.length === 0) {
      return res.status(404).json({ error: 'Lender product not found' });
    }

    const application = appData.rows[0];
    const product = productData.rows[0];

    // 4. Create transmission record
    const transmissionQuery = `
      INSERT INTO transmissions (
        application_id, 
        lender_product_id, 
        transmitted_by, 
        status, 
        transmission_data,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, created_at`;
    
    const transmissionData = {
      application: application,
      lenderProduct: product,
      transmittedAt: new Date().toISOString(),
      documentsIncluded: application.documents?.length || 0
    };

    const transmissionResult = await pool.query(transmissionQuery, [
      applicationId,
      productId,
      userId,
      'sent',
      JSON.stringify(transmissionData)
    ]);

    const transmissionId = transmissionResult.rows[0].id;

    console.log(`✅ [STEP 5 TRANSMIT] Successfully sent application to ${product.lender_name}, transmission ID: ${transmissionId}`);

    // 5. Update application status to indicate it's been sent to lenders
    await pool.query(
      `UPDATE applications SET status = 'submitted_to_lenders', updated_at = NOW() WHERE id = $1`,
      [applicationId]
    );

    res.json({
      success: true,
      transmissionId,
      applicationId,
      productId,
      lenderName: product.lender_name,
      productName: product.product_name,
      documentsIncluded: application.documents?.length || 0,
      transmittedAt: transmissionResult.rows[0].created_at,
      message: `Application successfully sent to ${product.lender_name}`
    });

  } catch (error: unknown) {
    console.error('❌ [STEP 5 TRANSMIT] Transmission error:', error);
    res.status(500).json({ 
      error: 'Failed to transmit application',
      details: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
    });
  }
});

export default router;