import { alias, Canonical } from './map';

function deepGet(obj: any, path: string): any {
  return path.split('.').reduce((a,k)=> (a && a[k]!==undefined ? a[k] : undefined), obj);
}
function present(v:any){ if(v===null||v===undefined) return false;
  if(typeof v==='string') return v.trim().length>0;
  if(Array.isArray(v)) return v.length>0;
  if(typeof v==='number') return !Number.isNaN(v);
  if(typeof v==='object') return Object.keys(v).length>0;
  return !!v;
}
function resolvePath(path:string, sources:any[]): any {
  if (path.includes(' + ')) {
    const parts = path.split(' + ').map(s=>s.trim());
    const vals = parts.map(p => resolvePath(p, sources));
    return vals.every(present) ? vals.join(' ').trim() : undefined;
  }
  for(const s of sources){ const v = deepGet(s, path); if(present(v)) return v; }
  return undefined;
}

export type CanonicalMap = Partial<Record<Canonical, any>>;
export function toCanonical(...sources:any[]): CanonicalMap {
  const out: CanonicalMap = {};
  (Object.keys(alias) as Canonical[]).forEach((k)=>{
    const v = resolvePath(alias[k][0], sources) ?? alias[k].slice(1).map(p=>resolvePath(p, sources)).find(present);
    if (present(v)) out[k] = v;
  });
  return out;
}

export function missingKeys(keys: Canonical[], can: CanonicalMap): string[] {
  return keys.filter(k => !present((can as any)[k]));
}

export function deepKeys(obj:any, prefix:string[]=[]): string[] {
  if (obj===null || obj===undefined) return [];
  if (typeof obj!=='object') return [prefix.join('.')];
  const out:string[]=[];
  for(const k of Object.keys(obj)){
    const nk=[...prefix,k];
    if (obj[k] && typeof obj[k]==='object' && !Array.isArray(obj[k])) out.push(...deepKeys(obj[k], nk));
    else out.push(nk.join('.'));
  }
  return out;
}