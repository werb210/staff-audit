const now = () => new Date().toISOString();
export const apps = {
    A1: { id: "A1", businessName: "Blue Finch Co", contact: { name: "A. Kim", phone: "555-0101", email: "ak@bf.com" }, amount: 45000, stage: "new", createdAt: now(), updatedAt: now(), requiredDocs: ["Driver ID", "Voided Cheque", "Bank Statements"], packageReady: false, lenderId: null, offer: null, decision: null, declineReason: null },
    A2: { id: "A2", businessName: "Prairie Tools", contact: { name: "J. Lee", phone: "555-0102", email: "jl@pt.com" }, amount: 120000, stage: "requires_docs", createdAt: now(), updatedAt: now(), requiredDocs: ["Driver ID", "Articles", "Bank Statements"], packageReady: false, lenderId: null, offer: null, decision: null, declineReason: null },
    A3: { id: "A3", businessName: "Sunrise Diner", contact: { name: "M. Patel", phone: "555-0103", email: "mp@sd.com" }, amount: 30000, stage: "in_review", createdAt: now(), updatedAt: now(), requiredDocs: ["Driver ID", "Bank Statements"], packageReady: false, lenderId: null, offer: null, decision: null, declineReason: null },
    A4: { id: "A4", businessName: "Cedar Cabinets", contact: { name: "R. Chen", phone: "555-0104", email: "rc@cc.com" }, amount: 210000, stage: "lender", createdAt: now(), updatedAt: now(), requiredDocs: ["Driver ID", "Articles", "COI"], packageReady: true, lenderId: "L1", offer: null, decision: null, declineReason: null },
    A5: { id: "A5", businessName: "Northside HVAC", contact: { name: "S. Diaz", phone: "555-0105", email: "sd@nh.com" }, amount: 80000, stage: "accepted", createdAt: now(), updatedAt: now(), requiredDocs: ["Driver ID", "Bank Statements", "COI"], packageReady: true, lenderId: "L2", offer: { apr: 12.5, termMonths: 24 }, decision: "approved", declineReason: null },
};
export const docs = {
    A1: [{ id: "d1", name: "Driver ID", status: "pending" }, { id: "d2", name: "Bank Statements", status: "missing" }],
    A2: [{ id: "d3", name: "Driver ID", status: "accepted" }, { id: "d4", name: "Articles", status: "pending" }, { id: "d5", name: "Bank Statements", status: "missing" }],
    A3: [{ id: "d6", name: "Driver ID", status: "accepted" }, { id: "d7", name: "Bank Statements", status: "accepted" }],
    A4: [{ id: "d8", name: "Driver ID", status: "accepted" }, { id: "d9", name: "Articles", status: "accepted" }, { id: "d10", name: "COI", status: "accepted" }],
    A5: [{ id: "d11", name: "Driver ID", status: "accepted" }, { id: "d12", name: "Bank Statements", status: "accepted" }, { id: "d13", name: "COI", status: "accepted" }],
};
export const notes = { A1: [], A2: [], A3: [], A4: [], A5: [] };
export const audit = [];
export function groupedBoard() {
    const stages = ["new", "requires_docs", "in_review", "lender", "accepted", "declined"];
    const lanes = Object.fromEntries(stages.map(s => [s, []]));
    Object.values(apps).forEach(a => lanes[a.stage].push(a));
    return lanes;
}
export function allItems() {
    return apps;
}
