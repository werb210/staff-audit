export function monthsBack(n) {
    const out = [];
    const d = new Date();
    for (let i = 0; i < n; i++) {
        const y = d.getFullYear(), m = d.getMonth() + 1;
        out.push(`${y}-${String(m).padStart(2, "0")}`);
        d.setMonth(d.getMonth() - 1);
    }
    return out;
}
export function taxYearsBack(n) {
    const y = new Date().getFullYear();
    return Array.from({ length: n }, (_, i) => String(y - i - 1)); // last completed tax years
}
