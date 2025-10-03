type Pref = { lenderId: string; reports: string[] }; // e.g., ["pipeline","funding","product","declines","geo"]
const _prefs = new Map<string,Pref>();

export const reportPrefsDb = {
  get(lenderId:string){ return _prefs.get(lenderId) || { lenderId, reports: ["pipeline","funding","product","declines"] }; },
  set(lenderId:string, reports:string[]){ const row = { lenderId, reports: Array.from(new Set(reports)) }; _prefs.set(lenderId, row); return row; },
  all(){ return Array.from(_prefs.values()); }
};