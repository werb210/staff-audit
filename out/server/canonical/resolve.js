import { alias } from './map';
function deepGet(obj, path) {
    return path.split('.').reduce((a, k) => (a && a[k] !== undefined ? a[k] : undefined), obj);
}
function present(v) {
    if (v === null || v === undefined)
        return false;
    if (typeof v === 'string')
        return v.trim().length > 0;
    if (Array.isArray(v))
        return v.length > 0;
    if (typeof v === 'number')
        return !Number.isNaN(v);
    if (typeof v === 'object')
        return Object.keys(v).length > 0;
    return !!v;
}
function resolvePath(path, sources) {
    if (path.includes(' + ')) {
        const parts = path.split(' + ').map(s => s.trim());
        const vals = parts.map(p => resolvePath(p, sources));
        return vals.every(present) ? vals.join(' ').trim() : undefined;
    }
    for (const s of sources) {
        const v = deepGet(s, path);
        if (present(v))
            return v;
    }
    return undefined;
}
export function toCanonical(...sources) {
    const out = {};
    Object.keys(alias).forEach((k) => {
        const v = resolvePath(alias[k][0], sources) ?? alias[k].slice(1).map(p => resolvePath(p, sources)).find(present);
        if (present(v))
            out[k] = v;
    });
    return out;
}
export function missingKeys(keys, can) {
    return keys.filter(k => !present(can[k]));
}
export function deepKeys(obj, prefix = []) {
    if (obj === null || obj === undefined)
        return [];
    if (typeof obj !== 'object')
        return [prefix.join('.')];
    const out = [];
    for (const k of Object.keys(obj)) {
        const nk = [...prefix, k];
        if (obj[k] && typeof obj[k] === 'object' && !Array.isArray(obj[k]))
            out.push(...deepKeys(obj[k], nk));
        else
            out.push(nk.join('.'));
    }
    return out;
}
