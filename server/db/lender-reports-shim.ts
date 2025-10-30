export type LenderReport = {
  id: string;
  lenderId: string;
  name: string;             // e.g., "Monthly Funding Summary"
  type: "link"|"iframe"|"pdf"|"csv"; // render hint
  url?: string;             // external URL or CDN/Azure path
  embedUrl?: string;        // for iframe dashboards if different
  createdAt: string;
};

const _rows: LenderReport[] = [
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
  listForLender(lenderId: string){ return _rows.filter(r => r.lenderId === lenderId); },
  listAll(){ return _rows.slice(); },
  get(id: string){ return _rows.find(r => r.id === id) || null; },
  create(row: Omit<LenderReport,"id"|"createdAt">){
    const r: LenderReport = { id: "lr-"+Date.now(), createdAt: new Date().toISOString(), ...row };
    _rows.push(r); return r;
  },
  delete(id: string){ const i=_rows.findIndex(r=>r.id===id); if(i>=0){ _rows.splice(i,1); return true; } return false; }
};