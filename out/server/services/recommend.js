export function scoreProducts(app, products) {
    const out = [];
    for (const p of products) {
        if (p.country !== app.country)
            continue;
        if (app.amountRequested < p.minAmount || app.amountRequested > p.maxAmount) {
            // we still include LOC later; skip others out of range
            if (p.category !== "LOC")
                continue;
        }
        const reasons = [];
        let score = 50;
        // Category match
        if (p.category === app.category) {
            score += 20;
            reasons.push("Category match");
        }
        // Amount fit
        if (app.amountRequested >= p.minAmount && app.amountRequested <= p.maxAmount) {
            score += 15;
            reasons.push("Within amount range");
        }
        else if (p.category === "LOC") {
            // LOC fallback inclusion (always include if within range)
            if (app.amountRequested >= p.minAmount && app.amountRequested <= p.maxAmount) {
                score += 10;
                reasons.push("LOC fallback in range");
            }
            else {
                continue; // LOC out of range: skip
            }
        }
        // Tenure & revenue signals
        if (p.minMonthsInBusiness && (app.monthsInBusiness ?? 0) >= p.minMonthsInBusiness) {
            score += 5;
            reasons.push("Meets months-in-business");
        }
        if (p.minMonthlyRevenue && (app.monthlyRevenue ?? 0) >= p.minMonthlyRevenue) {
            score += 5;
            reasons.push("Meets monthly revenue");
        }
        // Risk penalty (from banking/OCR). Lower riskScore is better.
        if (typeof app.riskScore === "number") {
            const adj = Math.max(-20, 20 - app.riskScore * 0.3); // risk 0 -> +20, risk 100 -> -10 (clamped)
            score += adj;
            reasons.push(`Risk adjustment ${Math.round(adj)}`);
        }
        // Industry exclusions
        if (p.industriesExcluded?.length && app.industry) {
            if (p.industriesExcluded.includes(app.industry)) {
                score -= 40;
                reasons.push("Industry exclusion");
            }
        }
        // Clamp 0..100
        score = Math.max(0, Math.min(100, Math.round(score)));
        out.push({ ...p, score, reasons });
    }
    // Always include LOC options within range even if category differs (already handled above)
    // Sort by score DESC then APR ASC if available
    out.sort((a, b) => (b.score - a.score) || ((a.baseApr ?? 999) - (b.baseApr ?? 999)));
    return out;
}
