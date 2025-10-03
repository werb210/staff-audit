export type CostRow = { id: string; campaign: string; month: string; cost: number }; // month: "YYYY-MM"
const _costs: CostRow[] = [
  { id: "mc-1", campaign: "Brand_CA_Q3", month: new Date().toISOString().slice(0,7), cost: 1200 },
  { id: "mc-2", campaign: "LI-Retargeting", month: new Date().toISOString().slice(0,7), cost: 800 }
];

export const costDb = {
  list(){ return _costs.slice(); },
  upsert(row: Omit<CostRow,"id"> & Partial<Pick<CostRow,"id">>) {
    const i = _costs.findIndex(x => x.campaign===row.campaign && x.month===row.month);
    if (i >= 0) { _costs[i] = { ..._costs[i], ...row }; return _costs[i]; }
    const r: CostRow = { id: "mc-"+Date.now(), ...row } as any;
    _costs.push(r); return r;
  }
};