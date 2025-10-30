export const arr = <T = any>(v: any): T[] =>
  Array.isArray(v) ? (v as T[]) : [];
export const obj = (v: any) => (v && typeof v === "object" ? v : {});
