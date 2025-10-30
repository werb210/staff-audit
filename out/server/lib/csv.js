export function toCSV(rows) {
    if (!rows.length)
        return "";
    const headers = Array.from(rows.reduce((s, r) => {
        Object.keys(r).forEach(k => s.add(k));
        return s;
    }, new Set()));
    const esc = (v) => {
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [
        headers.join(","),
        ...rows.map(r => headers.map(h => esc(r[h])).join(","))
    ].join("\n");
}
