type Row = { id: string; contactId?: string|null; callSid: string; text: string; at: string };
const _rows: Row[] = [];

export const transcripts = {
  add(row: Row){ _rows.push(row); return row; },
  listByContact(contactId: string){ return _rows.filter(r => r.contactId === contactId); },
  all(){ return _rows; }
};

// naive search across comms + transcripts
export function searchAll(q: string, comms: Array<{text?:string; subject?:string}>){
  const needle = q.toLowerCase();
  const cHits = comms.filter(m => (m.text||m.subject||"").toLowerCase().includes(needle));
  const tHits = _rows.filter(r => r.text.toLowerCase().includes(needle));
  return { cHits, tHits };
}