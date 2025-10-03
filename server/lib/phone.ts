export function normalizeE164(s: string | null | undefined) {
  if (!s) return null;
  const t = s.replace(/[^\d+]/g, '');
  if (!t.startsWith('+')) return null; // keep simple: require full E.164
  return t;
}