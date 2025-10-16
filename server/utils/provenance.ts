/**
 * Provenance utilities – tag each field with where its value came from.
 * Usage pattern: prov.build(record, { fieldName: prov.db(raw.field), ... })
 */
export type ProvTag =
  | { source: 'db'; note?: string }
  | { source: 'alias'; of: string; note?: string }
  | { source: 'computed'; note?: string }
  | { source: 'fallback'; kind: 'null' | 'const' | 'coalesce'; note?: string };

export const prov = {
  db: (note?: string): ProvTag => ({ source: 'db', note }),
  alias: (of: string, note?: string): ProvTag => ({ source: 'alias', of, note }),
  computed: (note?: string): ProvTag => ({ source: 'computed', note }),
  fallbackNull: (note?: string): ProvTag => ({ source: 'fallback', kind: 'null', note }),
  fallbackConst: (note?: string): ProvTag => ({ source: 'fallback', kind: 'const', note }),
  fallbackCoalesce: (note?: string): ProvTag => ({ source: 'fallback', kind: 'coalesce', note }),

  /**
   * Attaches a _prov map to a cloned object. Only applied when diag=true upstream.
   */
  attach<T extends Record<string, any>>(
    obj: T,
    map: Record<string, ProvTag | undefined>
  ): T & { _prov: Record<string, ProvTag> } {
    const _prov: Record<string, ProvTag> = {};
    for (const k of Object.keys(map)) {
      if (map[k]) _prov[k] = map[k] as ProvTag;
    }
    return Object.assign({}, obj, { _prov });
  },

  /**
   * Summarize a list of records that already have _prov attached.
   */
  summarize(list: Array<{ _prov?: Record<string, ProvTag> }>) {
    const counts: Record<string, number> = {};
    for (const rec of list) {
      if (!rec || !rec._prov) continue;
      for (const [field, tag] of Object.entries(rec._prov)) {
        const key = `${field}:${tag.source}${'kind' in tag && tag.kind ? ':'+tag.kind : ''}`;
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  },
};