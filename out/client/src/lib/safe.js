export const arr = (v) => Array.isArray(v) ? v : [];
export const obj = (v) => (v && typeof v === "object" ? v : {});
