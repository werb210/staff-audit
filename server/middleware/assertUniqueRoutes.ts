import type { Express } from 'express'

export function assertUniqueRoutes(app: Express, critical: string[]) {
  const seen = new Map<string, number>()
  
  // @ts-ignore - access private stack for inspection in dev
  for (const layer of app._router?.stack ?? []) {
    const r = layer?.route?.path
    const m = Object.keys(layer?.route?.methods ?? {})
    if (!r) continue
    const key = `${m.join(',').toUpperCase()} ${r}`
    seen.set(key, (seen.get(key) ?? 0) + 1)
  }
  
  const dupes = critical.filter((r) => (Array.from(seen.keys()).filter(k => k.endsWith(` ${r}`)).length > 1))
  if (dupes.length) {
    throw new Error(`❌ Duplicate route mounts detected: ${dupes.join(', ')}`)
  }
  
  console.log('✅ Route uniqueness verified for critical endpoints')
}