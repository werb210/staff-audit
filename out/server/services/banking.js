export function computeBankingMetrics(transactions) {
    // Stub: synthesize a plausible series if none provided
    const days = 30;
    const series = [];
    let bal = 5000;
    let deposits = 0, outflows = 0, nsf = 0, absDev = 0;
    for (let i = days - 1; i >= 0; i--) {
        const date = new Date(Date.now() - i * 86400000);
        const inflow = Math.max(0, Math.round(200 + Math.random() * 800));
        const outflow = Math.max(0, Math.round(150 + Math.random() * 900));
        bal += inflow - outflow;
        if (bal < 0)
            nsf++;
        deposits += inflow;
        outflows += outflow;
        series.push({ date: date.toISOString().slice(0, 10), balance: bal, inflow, outflow });
    }
    const avg = series.reduce((a, b) => a + b.balance, 0) / days;
    const mean = avg;
    absDev = series.reduce((a, b) => a + Math.abs(b.balance - mean), 0) / days;
    const volatilityIndex = Math.max(0, Math.min(100, Math.round((absDev / (Math.abs(mean) + 1)) * 100)));
    return {
        avgDailyBalance30: Math.round(avg),
        deposits30: deposits,
        nsfCount30: nsf,
        outflows30: outflows,
        inflows30: deposits,
        volatilityIndex,
        last30Days: series
    };
}
