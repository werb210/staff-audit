// services/lenderRecommendation.ts
export function recommendLenders(applicant, lenderProducts) {
    const results = [];
    console.log(`🎯 [LENDER-ENGINE] Processing ${lenderProducts.length} lenders for applicant:`, {
        country: applicant.country,
        category: applicant.product_category,
        amount: applicant.requested_amount,
        industry: applicant.industry
    });
    for (const lender of lenderProducts) {
        const missing = [];
        let score = 0;
        const overrides = [];
        console.log(`🎯 [LENDER-ENGINE] Checking lender: ${lender.name}`, {
            country: lender.country,
            category: lender.category,
            min_amount: lender.min_amount,
            max_amount: lender.max_amount
        });
        // ✅ Hard filters
        if (lender.country !== applicant.country) {
            console.log(`❌ [FILTER] Country mismatch: ${lender.country} !== ${applicant.country}`);
            continue;
        }
        if (lender.category !== applicant.product_category) {
            console.log(`❌ [FILTER] Category mismatch: ${lender.category} !== ${applicant.product_category}`);
            continue;
        }
        if (applicant.requested_amount < lender.min_amount || applicant.requested_amount > lender.max_amount) {
            console.log(`❌ [FILTER] Amount outside range: ${applicant.requested_amount} not in [${lender.min_amount}, ${lender.max_amount}]`);
            continue;
        }
        if (lender.excluded_industries?.includes(applicant.industry)) {
            console.log(`❌ [FILTER] Industry excluded: ${applicant.industry}`);
            continue;
        }
        console.log(`✅ [FILTER] Lender passed all hard filters: ${lender.name}`);
        // ✅ Time in business
        if (applicant.time_in_business_months >= lender.min_time_in_business) {
            score += 20;
        }
        else {
            score += 10;
            missing.push('time_in_business');
        }
        // ✅ Revenue
        if (applicant.monthly_revenue >= lender.min_monthly_revenue) {
            score += 20;
        }
        else {
            score += 10;
            missing.push('monthly_revenue');
        }
        // ✅ Documents
        const missingDocs = (lender.required_documents || []).filter((doc) => !applicant.documents.includes(doc));
        if (missingDocs.length === 0) {
            score += 20;
        }
        else if (missingDocs.length === 1) {
            score += 15;
            missing.push('document:' + missingDocs[0]);
        }
        else {
            score += 5;
            missing.push(...missingDocs.map((d) => 'document:' + d));
        }
        // ✅ Banking Analysis
        const avgBal = applicant.banking?.average_balance ?? 0;
        const nsf = applicant.banking?.nsf_count ?? 99;
        const volatility = applicant.banking?.daily_balance_volatility_score ?? 100;
        if (avgBal > 5000 && nsf < 3 && volatility < 50) {
            score += 15;
        }
        else {
            score += 5;
            missing.push('banking_health');
        }
        // ✅ OCR Financials
        const cashFlowOk = applicant.ocr?.cash_flow_positive;
        const netIncome = applicant.ocr?.net_income ?? 0;
        if (cashFlowOk && netIncome > 0) {
            score += 15;
        }
        else {
            score += 5;
            missing.push('financial_metrics');
        }
        // 🛑 Cap low scores
        if (score < 50)
            continue;
        // ✅ Apply fallback overrides
        if (lender.category === 'LOC' && applicant.requested_amount >= lender.min_amount && applicant.requested_amount <= lender.max_amount) {
            overrides.push('LOC fallback');
            score = Math.max(score, 70);
        }
        if (lender.category === 'Working Capital' && score < 70) {
            overrides.push('Working Capital fallback');
            score += 10;
        }
        results.push({
            lender_id: lender.id,
            lender_name: lender.name,
            match_score: Math.min(score, 100),
            estimated_approval: score >= 90 ? 'High' : score >= 75 ? 'Medium' : 'Low',
            missing_criteria: missing,
            overrides_applied: overrides.length ? overrides : undefined,
        });
    }
    return results.sort((a, b) => b.match_score - a.match_score);
}
