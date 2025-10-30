// Safe string utilities to prevent toLowerCase() undefined errors
export const safeString = (value) => {
    if (typeof value === "string")
        return value;
    if (value === null || value === undefined)
        return "";
    return String(value);
};
export const safeLower = (value) => {
    return safeString(value).toLowerCase();
};
export const safeIncludes = (haystack, needle) => {
    const hay = safeLower(haystack);
    const need = safeLower(needle);
    return hay.includes(need);
};
export const safeFilter = (items, searchQ, getters) => {
    if (!searchQ)
        return items;
    const q = safeLower(searchQ);
    if (!q)
        return items;
    return items.filter((item) => getters.some((getter) => {
        try {
            const value = getter(item);
            return safeLower(value).includes(q);
        }
        catch {
            return false;
        }
    }));
};
