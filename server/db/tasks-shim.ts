const _rows: any[] = [];
export const tasks = {
  async create(t:any){ const row = { id:"task-"+Date.now(), status:"open", ...t }; _rows.push(row); return row; },
  async list(){ return _rows; },
  async setStatus(id:string, status:"open"|"done"|"cancelled"){ const r=_rows.find(x=>x.id===id); if(r){ r.status=status; return r;} return null; }
};