// Safe string utilities to prevent toLowerCase() undefined errors
export const safeString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
};

export const safeLower = (value: unknown): string => {
  return safeString(value).toLowerCase();
};

export const safeIncludes = (haystack: unknown, needle: unknown): boolean => {
  const hay = safeLower(haystack);
  const need = safeLower(needle);
  return hay.includes(need);
};

export const safeFilter = <T>(
  items: T[],
  searchQ: unknown,
  getters: ((item: T) => unknown)[],
): T[] => {
  if (!searchQ) return items;
  const q = safeLower(searchQ);
  if (!q) return items;

  return items.filter((item) =>
    getters.some((getter) => {
      try {
        const value = getter(item);
        return safeLower(value).includes(q);
      } catch {
        return false;
      }
    }),
  );
};
