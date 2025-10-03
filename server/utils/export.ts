export function toCSV(rows: any[]): string {
  if (!rows?.length) return "";
  const keys = Array.from(
    rows.reduce((set, r) => { Object.keys(r||{}).forEach(k=>set.add(k)); return set; }, new Set<string>())
  );
  const escape = (v:any) => {
    if (v==null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  };
  return [keys.join(","), ...rows.map(r=>keys.map(k=>escape(r[k])).join(","))].join("\n");
}

export function toXLSXBuffer(rows: any[]): Buffer {
  // super-light "Excel" via CSV buffer (works in Excel/Sheets)
  const csv = toCSV(rows);
  return Buffer.from(csv, "utf8");
}