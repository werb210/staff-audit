// services/applicationService.ts
import { db } from '../db';
import { sql } from 'drizzle-orm';
console.log('📋 [APPLICATION-SERVICE] Service loading...');
export async function getFullApplicationData(applicationId) {
    try {
        console.log(`📋 [APPLICATION-SERVICE] Fetching full data for application: ${applicationId}`);
        // Get application with form data
        const appResult = await db.execute(sql `
      SELECT 
        id,
        form_data,
        status,
        createdAt
      FROM applications 
      WHERE id = ${applicationId}
      LIMIT 1
    `);
        if (!appResult.rows || appResult.rows.length === 0) {
            throw new Error(`Application not found: ${applicationId}`);
        }
        const application = appResult.rows[0];
        const formData = application.form_data || {};
        // Get banking analysis
        const bankingResult = await db.execute(sql `
      SELECT 
        average_daily_balance,
        nsf_count,
        volatility_score
      FROM banking_analysis 
      WHERE applicationId = ${applicationId}
      ORDER BY createdAt DESC
      LIMIT 1
    `);
        // Get OCR insights
        const ocrResult = await db.execute(sql `
      SELECT 
        extracted_data
      FROM ocr_results 
      WHERE applicationId = ${applicationId}
      ORDER BY processed_at DESC
      LIMIT 1
    `);
        // Get accepted documents
        const documentsResult = await db.execute(sql `
      SELECT 
        document_type
      FROM documents 
      WHERE applicationId = ${applicationId} 
      AND status = 'accepted'
    `);
        // Extract data from form steps
        const step1 = formData.step1 || {};
        const step2 = formData.step2 || {};
        const step3 = formData.step3 || {};
        const step4 = formData.step4 || {};
        // Parse banking data
        const bankingData = bankingResult.rows?.[0];
        // Parse OCR data
        const ocrData = ocrResult.rows?.[0];
        const extractedData = ocrData?.extracted_data || {};
        // Parse documents
        const documents = (documentsResult.rows || []).map((row) => row.document_type);
        const applicationInput = {
            country: step3.country || step2.country || 'US',
            product_category: determineProductCategory(step1.loanPurpose || step1.useOfFunds),
            requested_amount: parseFloat(step1.loanAmount || step1.requestedAmount) || 50000,
            industry: step2.industry || step3.businessType || 'Other',
            time_in_business_months: calculateTimeInBusinessMonths(step2.yearsInBusiness || step3.yearsInBusiness),
            monthly_revenue: parseFloat(step1.monthlyRevenue || step2.monthlyRevenue) || 0,
            documents: documents,
            banking: bankingData ? {
                average_balance: bankingData.average_balance,
                nsf_count: bankingData.nsf_count,
                daily_balance_volatility_score: bankingData.daily_balance_volatility_score
            } : undefined,
            ocr: extractedData ? {
                net_income: extractedData.net_income || extractedData.netIncome,
                cash_flow_positive: extractedData.cash_flow_positive || extractedData.cashFlowPositive
            } : undefined
        };
        console.log(`📋 [APPLICATION-SERVICE] Successfully compiled data for ${applicationId}:`, {
            category: applicationInput.product_category,
            amount: applicationInput.requested_amount,
            documents: applicationInput.documents.length,
            hasBanking: !!applicationInput.banking,
            hasOCR: !!applicationInput.ocr
        });
        return applicationInput;
    }
    catch (error) {
        console.error(`📋 [APPLICATION-SERVICE] Error fetching application data for ${applicationId}:`, error);
        throw error;
    }
}
function determineProductCategory(loanPurpose) {
    if (!loanPurpose)
        return 'Working Capital';
    const purpose = loanPurpose.toLowerCase();
    if (purpose.includes('equipment'))
        return 'Equipment Financing';
    if (purpose.includes('purchase order') || purpose.includes('po financing'))
        return 'Purchase Order Financing';
    if (purpose.includes('invoice') || purpose.includes('factoring'))
        return 'Invoice Factoring';
    if (purpose.includes('line of credit') || purpose.includes('loc'))
        return 'LOC';
    if (purpose.includes('term loan'))
        return 'Term Loan';
    if (purpose.includes('sba'))
        return 'SBA Loan';
    if (purpose.includes('asset') || purpose.includes('collateral'))
        return 'Asset-Based Lending';
    return 'Working Capital'; // Default fallback
}
function calculateTimeInBusinessMonths(years) {
    if (typeof years === 'number')
        return years * 12;
    if (typeof years === 'string') {
        const numYears = parseFloat(years);
        if (!isNaN(numYears))
            return numYears * 12;
    }
    return 24; // Default 2 years
}
console.log('📋 [APPLICATION-SERVICE] Service ready');
