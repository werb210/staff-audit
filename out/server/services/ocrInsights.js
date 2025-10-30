export function buildOcrView(raw) {
    const grouped = {
        "Balance Sheet Data": [], "Income Statement": [], "Cash Flow Statements": [], "Taxes": [], "Contracts": [], "Invoices": []
    };
    for (const r of raw)
        grouped[r.group].push({ label: r.label, value: r.value, sourceDocId: r.docId });
    // Always scan all docs for "Items Required" labels (example set)
    const requiredLabels = ["SIN", "Website URL", "Legal Business Name", "Address"];
    const requiredMap = {};
    for (const lab of requiredLabels)
        requiredMap[lab] = { label: lab, sources: [] };
    for (const r of raw) {
        if (requiredMap[r.label]) {
            requiredMap[r.label].sources.push({ docId: r.docId, value: r.value });
        }
    }
    for (const k of Object.keys(requiredMap)) {
        const item = requiredMap[k];
        const distinct = Array.from(new Set(item.sources.map(s => s.value)));
        if (distinct.length === 1)
            item.value = distinct[0];
        if (distinct.length > 1)
            item.conflict = true;
    }
    return { grouped, required: Object.values(requiredMap) };
}
