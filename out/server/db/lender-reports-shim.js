const _rows = [
    {
        id: "lr-1",
        lenderId: "l-1",
        name: "Funding Performance (Live)",
        type: "iframe",
        embedUrl: "https://example.com/dash?id=abc",
        createdAt: new Date().toISOString()
    }
];
export const lenderReportsDb = {
    listForLender(lenderId) { return _rows.filter(r => r.lenderId === lenderId); },
    listAll() { return _rows.slice(); },
    get(id) { return _rows.find(r => r.id === id) || null; },
    create(row) {
        const r = { id: "lr-" + Date.now(), createdAt: new Date().toISOString(), ...row };
        _rows.push(r);
        return r;
    },
    delete(id) { const i = _rows.findIndex(r => r.id === id); if (i >= 0) {
        _rows.splice(i, 1);
        return true;
    } return false; }
};
