const _apps = new Map();
// seed one
if (!_apps.size) {
    _apps.set("app-2", {
        id: "app-2",
        businessName: "Prairie Goods Ltd",
        contactId: "ct-1",
        contactPhone: "+15555550123",
        requestedAmount: 120000,
        stage: "Off to Lender",
        assignedLenderId: "l-1",
        updatedAt: new Date().toISOString()
    });
}
export const appsDb = {
    async listForLender(lenderId) {
        return Array.from(_apps.values()).filter(a => a.assignedLenderId === lenderId && a.stage === "Off to Lender");
    },
    async get(appId) { return _apps.get(appId) || null; },
    async update(appId, patch) {
        const a = _apps.get(appId);
        if (!a)
            return null;
        const n = { ...a, ...patch, updatedAt: new Date().toISOString() };
        _apps.set(appId, n);
        return n;
    },
    // crude stats used by reports
    async listAllForLender(lenderId) { return Array.from(_apps.values()).filter(a => a.assignedLenderId === lenderId); }
};
