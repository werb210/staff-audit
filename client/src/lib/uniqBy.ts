export function uniqBy<T, K extends keyof T>(xs: T[], key: K): T[] {
  const m = new Map<any, T>();
  for (const x of xs) if (!m.has((x as any)[key])) m.set((x as any)[key], x);
  return [...m.values()];
}
