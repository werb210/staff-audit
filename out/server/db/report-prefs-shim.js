const _prefs = new Map();
export const reportPrefsDb = {
    get(lenderId) { return _prefs.get(lenderId) || { lenderId, reports: ["pipeline", "funding", "product", "declines"] }; },
    set(lenderId, reports) { const row = { lenderId, reports: Array.from(new Set(reports)) }; _prefs.set(lenderId, row); return row; },
    all() { return Array.from(_prefs.values()); }
};
