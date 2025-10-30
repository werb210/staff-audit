export const prov = {
    db: (note) => ({ source: 'db', note }),
    alias: (of, note) => ({ source: 'alias', of, note }),
    computed: (note) => ({ source: 'computed', note }),
    fallbackNull: (note) => ({ source: 'fallback', kind: 'null', note }),
    fallbackConst: (note) => ({ source: 'fallback', kind: 'const', note }),
    fallbackCoalesce: (note) => ({ source: 'fallback', kind: 'coalesce', note }),
    /**
     * Attaches a _prov map to a cloned object. Only applied when diag=true upstream.
     */
    attach(obj, map) {
        const _prov = {};
        for (const k of Object.keys(map)) {
            if (map[k])
                _prov[k] = map[k];
        }
        return Object.assign({}, obj, { _prov });
    },
    /**
     * Summarize a list of records that already have _prov attached.
     */
    summarize(list) {
        const counts = {};
        for (const rec of list) {
            if (!rec || !rec._prov)
                continue;
            for (const [field, tag] of Object.entries(rec._prov)) {
                const key = `${field}:${tag.source}${'kind' in tag && tag.kind ? ':' + tag.kind : ''}`;
                counts[key] = (counts[key] || 0) + 1;
            }
        }
        return counts;
    },
};
