import express from 'express';
import { db } from '../db';
import { lenderProducts } from '../../shared/schema';
import { eq } from 'drizzle-orm';
const router = express.Router();
// Calculate match score based on multiple factors
function calculateMatchScore(application, product, factors = {
    amountMatch: 0.4, // 40% weight for amount within range
    countryMatch: 0.3, // 30% weight for country match
    creditScore: 0.2, // 20% weight for credit score (if available)
    purposeMatch: 0.1 // 10% weight for purpose/product type alignment
}) {
    let score = 0;
    // Amount matching (within product range)
    if (application.requestedAmount >= product.minimum_lending_amount &&
        application.requestedAmount <= product.maximum_lending_amount) {
        score += factors.amountMatch;
    }
    else {
        // Partial score if close to range
        const deviation = Math.min(Math.abs(application.requestedAmount - product.minimum_lending_amount), Math.abs(application.requestedAmount - product.maximum_lending_amount));
        const maxAmount = product.maximum_lending_amount;
        const proximity = Math.max(0, 1 - (deviation / maxAmount));
        score += factors.amountMatch * proximity * 0.5; // Half credit for near misses
    }
    // Country matching
    if (application.country === product.country_offered || product.country_offered === 'Global') {
        score += factors.countryMatch;
    }
    // Credit score matching (if available)
    if (application.creditScore && product.minimum_credit_score) {
        if (application.creditScore >= product.minimum_credit_score) {
            score += factors.creditScore;
        }
        else {
            // Partial credit for close credit scores
            const deviation = product.minimum_credit_score - application.creditScore;
            const proximity = Math.max(0, 1 - (deviation / 100)); // Assume 100 point scale
            score += factors.creditScore * proximity * 0.3;
        }
    }
    else if (!product.minimum_credit_score) {
        // Full credit if no credit score requirement
        score += factors.creditScore;
    }
    // Purpose/product type matching (basic keyword matching)
    if (application.purpose && product.product_category) {
        const purposeLower = application.purpose.toLowerCase();
        const categoryLower = product.product_category.toLowerCase();
        const keywords = {
            'business loan': ['business', 'equipment', 'expansion', 'working capital'],
            'personal loan': ['personal', 'debt consolidation', 'home improvement'],
            'mortgage': ['home', 'property', 'real estate', 'mortgage'],
            'auto loan': ['vehicle', 'car', 'auto', 'truck']
        };
        const categoryKeywords = keywords[categoryLower] || [categoryLower];
        const hasMatch = categoryKeywords.some(keyword => purposeLower.includes(keyword));
        if (hasMatch) {
            score += factors.purposeMatch;
        }
    }
    return Math.min(1, score); // Cap at 1.0 (100%)
}
// GET /api/lender/matches - Get matched applications for authenticated lender
router.get('/matches', async (req, res) => {
    try {
        console.log('🎯 [LENDER-MATCHES] Processing matches request');
        // For demo purposes, we'll use a mock lender ID
        // In production, this would come from authenticated session
        const lenderId = req.query.lenderId || 'demo-lender-uuid';
        const minScore = parseFloat(req.query.minScore) || 0.3; // 30% minimum match
        const limit = parseInt(req.query.limit) || 50;
        // Get lender's products
        const lenderProductsData = await db
            .select()
            .from(lenderProducts)
            .where(eq(lenderProducts.lender_id, lenderId));
        console.log(`📊 [LENDER-MATCHES] Found ${lenderProductsData.length} products for lender`);
        if (lenderProductsData.length === 0) {
            return res.json({ matches: [], message: 'No products configured for this lender' });
        }
        // Get all pending applications (mock data for now)
        const mockApplications = [
            {
                id: 'app-001',
                applicantName: 'Tech Innovations Ltd',
                requestedAmount: 75000,
                purpose: 'Equipment purchase for manufacturing expansion',
                country: 'Canada',
                creditScore: 720,
                status: 'pending',
                submittedAt: '2025-08-20T10:30:00Z'
            },
            {
                id: 'app-002',
                applicantName: 'Sarah Johnson',
                requestedAmount: 25000,
                purpose: 'Debt consolidation and home improvements',
                country: 'Canada',
                creditScore: 680,
                status: 'pending',
                submittedAt: '2025-08-21T14:15:00Z'
            },
            {
                id: 'app-003',
                applicantName: 'Green Energy Solutions',
                requestedAmount: 150000,
                purpose: 'Working capital for renewable energy projects',
                country: 'United States',
                creditScore: 750,
                status: 'pending',
                submittedAt: '2025-08-21T09:45:00Z'
            },
            {
                id: 'app-004',
                applicantName: 'Mountain View Restaurant',
                requestedAmount: 50000,
                purpose: 'Restaurant expansion and equipment upgrade',
                country: 'Canada',
                creditScore: 650,
                status: 'pending',
                submittedAt: '2025-08-22T11:20:00Z'
            },
            {
                id: 'app-005',
                applicantName: 'DataTech Solutions Inc',
                requestedAmount: 200000,
                purpose: 'Technology infrastructure and software development',
                country: 'Canada',
                creditScore: 780,
                status: 'pending',
                submittedAt: '2025-08-22T08:30:00Z'
            }
        ];
        const matches = [];
        // Calculate matches for each application
        for (const application of mockApplications) {
            const applicationMatches = [];
            let bestScore = 0;
            const matchingProducts = [];
            // Check against each lender product
            for (const product of lenderProductsData) {
                const score = calculateMatchScore(application, product);
                if (score >= minScore) {
                    matchingProducts.push(product.product_name);
                    bestScore = Math.max(bestScore, score);
                }
            }
            // If any products match, add to results
            if (matchingProducts.length > 0) {
                matches.push({
                    id: `match-${application.id}`,
                    applicationId: application.id,
                    applicantName: application.applicantName,
                    requestedAmount: application.requestedAmount,
                    purpose: application.purpose,
                    country: application.country,
                    creditScore: application.creditScore,
                    status: application.status,
                    matchScore: bestScore,
                    matchingProducts,
                    submittedAt: application.submittedAt
                });
            }
        }
        // Sort by match score (highest first) and limit results
        matches.sort((a, b) => b.matchScore - a.matchScore);
        const limitedMatches = matches.slice(0, limit);
        console.log(`✅ [LENDER-MATCHES] Returning ${limitedMatches.length} matches`);
        res.json({
            matches: limitedMatches,
            total: limitedMatches.length,
            lenderProducts: lenderProductsData.length,
            criteria: { minScore, limit }
        });
    }
    catch (error) {
        console.error('❌ [LENDER-MATCHES] Error processing matches:', error);
        res.status(500).json({
            error: 'Failed to process application matches',
            message: error instanceof Error ? error instanceof Error ? error.message : String(error) : 'Unknown error'
        });
    }
});
// GET /api/lender/matches/stats - Get matching statistics
router.get('/matches/stats', async (req, res) => {
    try {
        const lenderId = req.query.lenderId || 'demo-lender-uuid';
        // Mock statistics for demo
        const stats = {
            totalMatches: 42,
            highQualityMatches: 28, // >70% match score
            mediumQualityMatches: 14, // 50-70% match score
            newMatchesToday: 7,
            averageMatchScore: 0.68,
            topMatchingProducts: [
                { productName: 'Business Equipment Loan', matches: 15 },
                { productName: 'Working Capital Line', matches: 12 },
                { productName: 'Commercial Real Estate', matches: 8 }
            ],
            matchesByCountry: {
                'Canada': 35,
                'United States': 7
            }
        };
        console.log('📈 [LENDER-MATCHES] Returning match statistics');
        res.json(stats);
    }
    catch (error) {
        console.error('❌ [LENDER-MATCHES] Error getting stats:', error);
        res.status(500).json({ error: 'Failed to get match statistics' });
    }
});
// POST /api/lender/matches/:matchId/express-interest
router.post('/matches/:matchId/express-interest', async (req, res) => {
    try {
        const { matchId } = req.params;
        const { message, offerTerms } = req.body;
        console.log(`💡 [LENDER-MATCHES] Lender expressing interest in match: ${matchId}`);
        // In production, this would:
        // 1. Create an interest record in the database
        // 2. Notify the applicant
        // 3. Update the application status
        // 4. Log the interaction
        // Mock response for demo
        const interestRecord = {
            id: `interest-${Date.now()}`,
            matchId,
            lenderId: req.query.lenderId || 'demo-lender-uuid',
            message,
            offerTerms,
            status: 'pending',
            createdAt: new Date().toISOString()
        };
        res.json({
            success: true,
            interest: interestRecord,
            message: 'Interest expressed successfully. Applicant will be notified.'
        });
    }
    catch (error) {
        console.error('❌ [LENDER-MATCHES] Error expressing interest:', error);
        res.status(500).json({ error: 'Failed to express interest' });
    }
});
export default router;
