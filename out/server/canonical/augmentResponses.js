import { toCanonical } from './resolve';
function isApp(o) { return o && (o.id || o.product_id || o.business_legal_name); }
export function augmentApplicationJson(req, res, next) {
    const original = res.json.bind(res);
    res.json = (data) => {
        try {
            if (req.query?.presence !== '1')
                return original(data);
            const base = isApp(data) ? data : (isApp(data?.application) ? data.application : null);
            if (base) {
                const merged = { ...(base || {}) };
                const payload = merged.form_data || merged.fields_raw || {};
                const keys = Object.keys(toCanonical(merged, payload));
                const presence = Object.fromEntries(keys.map(k => [k, true]));
                if (isApp(data))
                    data.__canonical = { presence };
                else
                    data.application.__canonical = { presence };
            }
        }
        catch (_) { }
        return original(data);
    };
    next();
}
