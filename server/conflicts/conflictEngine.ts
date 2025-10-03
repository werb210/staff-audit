import type { SourcedValue } from './sourceTypes';

export interface ColumnConflict {
  column: string;
  values: Array<{ value: string; sourceType: string; sourceId: string; label?: string; observedAt?: string }>;
  conflict: boolean;
}

function norm(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return v.toFixed(2);              // normalize numeric comparison
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v).trim().replace(/\s+/g, ' ').toLowerCase();   // case/space insensitive compare
}

/** Build conflicts per canonical column */
export function buildConflicts(records: SourcedValue[]): Record<string, ColumnConflict> {
  const byCol: Record<string, ColumnConflict> = {};
  for (const r of records) {
    if (!r.column) continue;
    const key = r.column;
    if (!byCol[key]) byCol[key] = { column: key, values: [], conflict: false };
    byCol[key].values.push({
      value: String(r.value ?? ''),
      sourceType: r.sourceType,
      sourceId: r.sourceId,
      label: r.label,
      observedAt: r.observedAt
    });
  }
  // compute conflict flags
  for (const c of Object.values(byCol)) {
    const distinct = new Set(c.values.map(v => norm(v.value)));
    c.conflict = distinct.size > 1 && c.values.length > 1;
  }
  return byCol;
}

/** Helper: is a column in conflict? */
export function hasConflict(col: string, conflicts: Record<string, ColumnConflict>): boolean {
  return !!conflicts[col]?.conflict;
}