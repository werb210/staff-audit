export const str = (...vals) => vals.find(v => v && `${v}`.trim().length > 0) ?? null;
export const num = (...vals) => {
    for (const v of vals) {
        if (v === null || v === undefined || v === '')
            continue;
        const n = typeof v === 'number' ? v : Number(String(v).replace(/[, ]/g, ''));
        if (!Number.isNaN(n))
            return n;
    }
    return null;
};
