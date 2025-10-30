// client/src/recommendation/filtering.ts - Recommendation engine with PO Financing
import { CategoryRules } from "../../../shared/categoryRules";
import { lower } from "@/lib/dedupe";
export function productEligible(product, form) {
    const cat = product.productCategory; // label form
    const rules = CategoryRules[cat];
    if (!rules)
        return false;
    // industry gating for PO Financing
    if (cat === "Purchase Order Financing" &&
        "industryRestriction" in rules &&
        rules.industryRestriction) {
        const industry = lower(form.industry);
        const ok = rules.industryRestriction.some((i) => industry.includes(lower(i)));
        if (!ok)
            return false;
    }
    const revOk = !rules.minMonthlyRevenue ||
        (form.monthlyRevenue || 0) >= rules.minMonthlyRevenue;
    const ficoOk = !rules.minCreditScore || (form.creditScore || 0) >= rules.minCreditScore;
    const amount = form.fundingAmount || 0;
    const withinRange = amount >= (product.minimumLendingAmount || 0) &&
        amount <= (product.maximumLendingAmount || Number.MAX_SAFE_INTEGER);
    return revOk && ficoOk && withinRange && product.isActive !== false;
}
// Helper for Step 2 recommendations
export function getEligibleProducts(products, applicationForm) {
    return products.filter((product) => productEligible(product, applicationForm));
}
// Category-specific validation for forms
export function validateCategoryRequirements(category, form) {
    const rules = CategoryRules[category];
    const errors = [];
    if (!rules) {
        return { valid: true, errors: [] };
    }
    if (rules.minMonthlyRevenue &&
        (form.monthlyRevenue || 0) < rules.minMonthlyRevenue) {
        errors.push(`Minimum monthly revenue of $${rules.minMonthlyRevenue.toLocaleString()} required`);
    }
    if (rules.minCreditScore && (form.creditScore || 0) < rules.minCreditScore) {
        errors.push(`Minimum credit score of ${rules.minCreditScore} required`);
    }
    if (category === "Purchase Order Financing" &&
        "industryRestriction" in rules &&
        rules.industryRestriction) {
        const industry = lower(form.industry);
        const validIndustry = rules.industryRestriction.some((i) => industry.includes(lower(i)));
        if (!validIndustry) {
            errors.push(`Purchase Order Financing is only available for ${rules.industryRestriction.join(" and ")} industries`);
        }
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
