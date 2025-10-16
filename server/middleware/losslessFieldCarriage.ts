import type { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import { toCanonical } from '../canonical/resolve';

const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL as string, 
  ssl: process.env.PGSSLMODE==='require'?{rejectUnauthorized:false}:undefined,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export function preCapture(req: Request, _res: Response, next: NextFunction){
  // clone safe copy for persistence
  (req as any).__rawBody = req.body ? JSON.parse(JSON.stringify(req.body)) : {};
  next();
}

export function postPersist(req: Request, res: Response, next: NextFunction){
  const raw = (req as any).__rawBody || {};
  const originalJson = res.json.bind(res);
  res.json = function(data: any) {
    (async () => {
      try{
        const id = data?.id || data?.application?.id;
        if (id) {
          const payload = (raw as any).payload ?? (raw as any).form_data ?? (raw as any).formFields ?? raw;
          const canonical = toCanonical(raw, payload);
          const unmapped = Object.fromEntries(Object.entries(payload || {}).filter(([k]) => !(k in (canonical as any))));
          await pool.query(`
            UPDATE applications
            SET
              form_data       = COALESCE(form_data, '{}'::jsonb)       || $1::jsonb,
              fields_raw      = COALESCE(fields_raw, '{}'::jsonb)      || $2::jsonb,
              fields_canonical= COALESCE(fields_canonical, '{}'::jsonb)|| $3::jsonb,
              fields_unmapped = COALESCE(fields_unmapped, '{}'::jsonb) || $4::jsonb
            WHERE id = $5
          `, [payload||{}, raw||{}, canonical||{}, unmapped||{}, id]);
        }
      }catch(e:any){ console.error("[losslessFieldCarriage]", e?.message||e); }
    })();
    return originalJson(data);
  };
  next();
}
