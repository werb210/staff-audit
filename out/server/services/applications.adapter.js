export const stageFromRaw = (s = '') => {
    const x = s.toLowerCase();
    if (/doc/.test(x))
        return 'requires_docs';
    if (/review|uw|underw/.test(x))
        return 'in_review';
    if (/lend|sent|with[_-\s]?lender/.test(x))
        return 'lender';
    if (/accept|fund/.test(x))
        return 'accepted';
    if (/declin|denied|lost/.test(x))
        return 'declined';
    return 'new';
};
export function normalizeApp(r) {
    const id = r.id || r.appId || r.applicationId || String(r.uuid || r._id);
    const createdAt = r.createdAt || r.createdAt || r.inserted_at || r.created || r.created_time || null;
    const updatedAt = r.updatedAt || r.updatedAt || r.modified || r.modified_time || createdAt || null;
    const businessName = r.businessName || r.company || r.legal_business_name || r.biz_name || r.business_name;
    const businessType = r.businessType || r.entity_type || r.naics || r.industry;
    const amount = Number(r.amount ?? r.requested_amount ?? r.loan_amount ?? r.capital_needed ?? 0) || 0;
    const status = r.status || r.stage || r.pipeline_status || 'new';
    const stage = stageFromRaw(status);
    const contactName = r.contactName || r.primary_contact || r.applicant_name || r.owner_name || '';
    const contactEmail = r.contactEmail || r.email || r.owner_email || r.applicant_email || '';
    const phone = r.phone || r.contact_phone || r.owner_phone || '';
    const mobile = r.mobile || r.mobile_e164 || r.cell || '';
    return {
        id, createdAt, updatedAt, businessName, businessType, amount, status, stage,
        contact: { name: contactName, email: contactEmail, phone, mobile },
        _raw: { ...r },
    };
}
export function buildBoard(apps) {
    const lanes = [
        { key: 'new', title: 'New', items: [] },
        { key: 'requires_docs', title: 'Requires Docs', items: [] },
        { key: 'in_review', title: 'In Review', items: [] },
        { key: 'lender', title: 'With Lender', items: [] },
        { key: 'accepted', title: 'Accepted', items: [] },
        { key: 'declined', title: 'Declined', items: [] },
    ];
    for (const a of apps) {
        const lane = lanes.find(l => l.key === a.stage) || lanes[0];
        lane.items.push(a);
    }
    return { lanes };
}
