const _events = [
    // seed a couple to see data immediately
    { id: "ie-1", source: "Google Ads", campaign: "Brand_CA_Q3", medium: "cpc", createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    { id: "ie-2", source: "LinkedIn", campaign: "LI-Retargeting", medium: "social", createdAt: new Date(Date.now() - 3 * 86400000).toISOString() }
];
export const intakeDb = {
    insert(e) {
        const row = { id: "ie-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6), createdAt: e.createdAt ?? new Date().toISOString(), ...e };
        _events.push(row);
        return row;
    },
    listBetween(fromISO, toISO) {
        const from = fromISO ? new Date(fromISO).getTime() : 0;
        const to = toISO ? new Date(toISO).getTime() : Date.now();
        return _events.filter(e => {
            const t = new Date(e.createdAt).getTime();
            return t >= from && t <= to;
        });
    }
};
