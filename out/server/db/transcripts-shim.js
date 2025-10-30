const _rows = [];
export const transcripts = {
    add(row) { _rows.push(row); return row; },
    listByContact(contactId) { return _rows.filter(r => r.contactId === contactId); },
    all() { return _rows; }
};
// naive search across comms + transcripts
export function searchAll(q, comms) {
    const needle = q.toLowerCase();
    const cHits = comms.filter(m => (m.text || m.subject || "").toLowerCase().includes(needle));
    const tHits = _rows.filter(r => r.text.toLowerCase().includes(needle));
    return { cHits, tHits };
}
